var AWS = require('aws-sdk');
const Alexa = require('ask-sdk-core');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const ddbTableName = 'controlmypi-alexa-user-table';

var iotdata = new AWS.IotData({endpoint:process.env.AWS_IOT_ENDPOINT});

const levelObj = {"0": "low", "1": "high"};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
      //console.log(handlerInput.requestEnvelope);
        //return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const speakOutput = 'Hello! Welcome to Control My Pi, the skill that allows you to control your Raspberry Pi Single Board Computer. ';
        const repromptText = 'What would you like to do?';

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

        // Retrieve pin and direction values from slots
        let pin = handlerInput.requestEnvelope.request.intent.slots.number.value;
        let pinDirection = handlerInput.requestEnvelope.request.intent.slots.pinDirection.value;
        let topic = "controlmypi/setgpiodirection/" + pin;

        publishMQTTmsg(iotdata, topic, pinDirection, 0);

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
        const speakOutput = 'You have triggered the Set GPIO Level Intent.';
        const repromptOutput = 'What would you like to do?';

        // Retrieve pin and pin level values from slots
        let pin = handlerInput.requestEnvelope.request.intent.slots.number.value;
        let pinLevel = handlerInput.requestEnvelope.request.intent.slots.pinLevel.value;
        let topic = "controlmypi/setgpiolevel/" + pin;

        publishMQTTmsg(iotdata, topic, pinLevel, 0);

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
        var payload = '';
        var pinLevel = 'aa';

        // Retrieve pin value from slots
        let pin = handlerInput.requestEnvelope.request.intent.slots.number.value;

        let topic = "controlmypi/readgpiolevel/" + pin;

        // Send message to pi to send the requested data back
        publishMQTTmsg(iotdata, topic, pin, 0);

        await sleep(1000)

        // Needed to add promise inside getThingShadow to make it wait to set pinLevel
        pinLevel = await getThingShadow(iotdata, 'ControlMyPi', payload, pin, pinLevel);

        speakOutput = 'Pin ' + pin + ' is currently set to ' + levelObj[pinLevel];

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

        let topic = "controlmypi/readgpiodirection/" + pin;

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
function getThingShadow(iotdataobj, myThingName, payload, pin, pinLevel) {
    return new Promise((resolve,reject) => {
        iotdata.getThingShadow({ thingName: myThingName }, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                context.done(err);
                reject(err);
            }
            payload = JSON.parse(data.payload);

            pinLevel = payload["state"]["reported"][pin];
            resolve(pinlevel);
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
