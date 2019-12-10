var AWS = require('aws-sdk');
const Alexa = require('ask-sdk-core');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const ddbTableName = 'controlmypi-alexa-user-table';

var iotdata = new AWS.IotData({endpoint:process.env.AWS_IOT_ENDPOINT});

const levelObj = {"0": "low", "1": "high"};

const device_hostname = "cmp1";

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        var speakOutput = 'Hello! Welcome to Control My Pi, the skill that allows you to control your Raspberry Pi Single Board Computer. ';
        const repromptText = 'What would you like to do?';

        const attributesManager = handlerInput.attributesManager;
        // Load the values from dynamoDB --> need to have await due to asynchronous operation
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        var pins = sessionAttributes.hasOwnProperty('pins') ? sessionAttributes.pins : {};

        var payload = '';
        var returnedTime = '';

        let topic = "controlmypi/" + device_hostname + "/heartbeat/" + 2;

        // Send message to pi to send the requested data back
        publishMQTTmsg(iotdata, topic, "2", 0);

        // Sleeping for 1000ms to make sure that shadow is updated before trying to read it
        await sleep(1000)

        // Get the current time from Lambda to compare to what is returned from device shadow
        let currentTime = Math.floor(new Date() / 1000);
        // We first need to check if raspberry pi code is running
        returnedTime = await getThingShadow(iotdata, 'ControlMyPi', payload, "timestamp", "timestamp");

        let timeDifference = Math.abs(returnedTime - currentTime);

        // If the code is running we should get a timestamp from the shadow that is within a certain treshold of time
        if (timeDifference < 30) {
            // Check if there are any keys in the object
            count = Object.keys(pins).length;

            // Only set the pin configuration if there is something stored in memory
            // Which we will assume is if there is at least one key stored
            if (count > 0) {
                // Even though it is not used, for some reason the '/2' needs to be there for it to work?
                topic = "controlmypi/" + device_hostname + "/batchsetgpiolevelsdirections/2";
                // The payload is the list of pins and the configurations
                // Raspberry Pi code will loop through and set accordingly
                publishMQTTmsg(iotdata, topic, JSON.stringify(pins), 0);
                speakOutput = speakOutput + 'We noticed that you have previously set some values so we configured your Raspberry Pi ' +
                                            'as you previously had it set up. What would you like to do?';
            } else {
                speakOutput = speakOutput + 'No pins have been configured. What would you like to do?';
            }
        } else {
            speakOutput = speakOutput + 'It appears that the code on the Raspberry Pi is currently not running. Please make sure ' +
                            'that this code is running.';
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

const ConfigureBoardIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ConfigureBoardIntent';
    },
    async handle(handlerInput) {
        const speakOutput = 'You have triggered the Configure Board Intent.';
        const repromptOutput = 'What would you like to do?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const SetGPIODirectionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SetGPIODirectionIntent';
    },
    async handle(handlerInput) {
        const speakOutput = 'You have triggered the Set GPIO Direction Intent.';
        const repromptOutput = 'What would you like to do?';

        const attributesManager = handlerInput.attributesManager;
        // Load the values from dynamoDB --> need to have await due to asynchronous operation
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        var pins = sessionAttributes.hasOwnProperty('pins') ? sessionAttributes.pins : {};

        // Retrieve pin and direction values from slots
        let pin = handlerInput.requestEnvelope.request.intent.slots.number.value;
        let pinDirection = handlerInput.requestEnvelope.request.intent.slots.pinDirection.value;
        let topic = "controlmypi/" + device_hostname + "/setgpiodirection/" + pin;

        publishMQTTmsg(iotdata, topic, pinDirection, 0);

        pins[pin] = {"direction": pinDirection};

        sessionAttributes.pins = pins;

        attributesManager.setPersistentAttributes(sessionAttributes);
        await attributesManager.savePersistentAttributes();

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const SetGPIOLevelIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SetGPIOLevelIntent';
    },
    async handle(handlerInput) {
        var speakOutput = '';
        const repromptOutput = 'What would you like to do?';

        const attributesManager = handlerInput.attributesManager;
        // Load the values from dynamoDB --> need to have await due to asynchronous operation
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        var pins = sessionAttributes.hasOwnProperty('pins') ? sessionAttributes.pins : {};
        console.log(pins)

        // Retrieve pin and pin level values from slots
        let pin = handlerInput.requestEnvelope.request.intent.slots.number.value;
        let pinLevel = handlerInput.requestEnvelope.request.intent.slots.pinLevel.value;
        let topic = "controlmypi/" + device_hostname + "/setgpiolevel/" + pin;

        if (typeof pins[pin] !== 'undefined' && pins[pin]) {
            if (pins[pin].direction == 'output') {
                speakOutput = 'Setting pin ' + pin + ' to ' + pinLevel + '. ';
                publishMQTTmsg(iotdata, topic, pinLevel, 0);
            } else {
                speakOutput = 'I am sorry but I cannot set the pin level to ' + pinLevel + ' as the direction needs ' +
                                'to be set to output. Pin ' + pin + ' is currently set as an input. If you would like to set ' +
                                'the pin direction please say \'Set direction of pin ' + pin + ' to output.\' ';
            }
        } else {
            speakOutput = 'I am sorry but I cannot set the pin as the direction needs to be set to output. ' +
                            'Pin ' + pin + ' has not been set. If you would like to set the pin direction please ' +
                            'say \'Set direction of pin ' + pin + ' to output.\' ';
        }

        speakOutput = speakOutput + 'What would you like to do now?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const ReadGPIOLevelIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ReadGPIOLevelIntent';
    },
    async handle(handlerInput) {
        var speakOutput = '';
        const repromptOutput = 'What would you like to do?';

        const attributesManager = handlerInput.attributesManager;
        // Load the values from dynamoDB --> need to have await due to asynchronous operation
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        var pins = sessionAttributes.hasOwnProperty('pins') ? sessionAttributes.pins : {};

        var payload = '';
        var pinLevel = '';

        // Retrieve pin value from slots
        let pin = handlerInput.requestEnvelope.request.intent.slots.number.value;

        let topic = "controlmypi/" + device_hostname + "/readgpiolevel/" + pin;

        if (typeof pins[pin] !== 'undefined' && pins[pin]) {

            // Send message to pi to send the requested data back
            publishMQTTmsg(iotdata, topic, pin, 0);

            // Sleeping for 1000ms to make sure that shadow is updated before trying to read it
            await sleep(1000)

            // Needed to add promise inside getThingShadow to make it wait to set pinLevel
            pinLevel = await getThingShadow(iotdata, 'ControlMyPi', payload, pin, "pinLevel");

            speakOutput = 'Pin ' + pin + ' is currently set to ' + levelObj[pinLevel];
        } else {
            speakOutput = 'I am sorry but I cannot read the pin as the direction needs to be set. ' +
                            'Pin ' + pin + ' has not been set.';
        }

        speakOutput = speakOutput + 'What would you like to do now?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const ReadGPIODirectionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ReadGPIODirectionIntent';
    },
    async handle(handlerInput) {
        const speakOutput = 'You have triggered the Read GPIO Direction Intent.';
        const repromptOutput = 'What would you like to do?';

        // Retrieve pin value from slots
        let pin = handlerInput.requestEnvelope.request.intent.slots.number.value;

        let topic = "controlmypi/" + device_hostname + "/readgpiodirection/" + pin;

        // Send message to pi to send the requested data back
        publishMQTTmsg(iotdata, topic, pin, 0);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const YesIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
	},
	async handle(handlerInput) {
		let speakOutput = "There was a problem with the YES response.";
		let repromptOutput = "There was a problem with the YES response.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const NoIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
	},
	async handle(handlerInput) {
		let speakOutput = "There was a problem with the NO response.";
		let repromptOutput = "There was a problem with the NO response.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
}

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const LoadServicesInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        const services = sessionAttributes.hasOwnProperty('services') ? sessionAttributes.services : 0;

        if (services) {
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
};

function getPersistenceAdapter(tableName) {
    // Determines persistence adapter to be used based on environment
    // Note: tableName is only used for DynamoDB Persistence Adapter
    if (process.env.S3_PERSISTENCE_BUCKET) {
        // in Alexa Hosted Environment
        // eslint-disable-next-line global-require
        const s3Adapter = require('ask-sdk-s3-persistence-adapter');
        return new s3Adapter.S3PersistenceAdapter({
            bucketName: process.env.S3_PERSISTENCE_BUCKET,
        });
    }

    // Not in Alexa Hosted Environment
    return new ddbAdapter.DynamoDbPersistenceAdapter({
        tableName: tableName,
        createTable: true,
    });
}

function publishMQTTmsg(iotdataobj, topic, payload, qos) {
	var params = {
			topic: topic,
			payload: payload,
			qos: qos
		};

	iotdataobj.publish(params, function(err, data){
		if(err){
			console.log("Error occured : ",err)
		}
		else{
			console.log("success.....");
		}
	});
}

// Method that gets the pin value from the thing. Wrapped a promise to get the code
// to wait until a value was valid
// Currently input is either pin# or timestamp
// outputSwitch is either "pinLevel" or "timestamp"
function getThingShadow(iotdataobj, myThingName, payload, input, outputSwitch) {
    return new Promise((resolve,reject) => {
        var output = '';
        iotdata.getThingShadow({ thingName: myThingName }, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                context.done(err);
                reject(err);
            }
            payload = JSON.parse(data.payload);
            if (outputSwitch == "pinLevel") {
                output = payload["state"]["reported"][input];
            } else {
                output = payload["state"]["reported"][input];
                console.log("input: " + input);
                console.log("output: " + output);
            }
            resolve(output);
        });
    })
}

function sleep(ms) {
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
	.withPersistenceAdapter(getPersistenceAdapter(ddbTableName))
    .withApiClient(new Alexa.DefaultApiClient())
    .addRequestHandlers(
        LaunchRequestHandler,
        ConfigureBoardIntentHandler,
        SetGPIODirectionIntentHandler,
        SetGPIOLevelIntentHandler,
        ReadGPIOLevelIntentHandler,
        ReadGPIODirectionIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addRequestInterceptors(
        LoadServicesInterceptor
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();
