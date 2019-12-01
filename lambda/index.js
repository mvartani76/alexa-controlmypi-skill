var AWS = require('aws-sdk');
const Alexa = require('ask-sdk-core');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const ddbTableName = 'controlmypi-alexa-user-table';

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

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
	.withPersistenceAdapter(getPersistenceAdapter(ddbTableName))
    .withApiClient(new Alexa.DefaultApiClient())
    .addRequestHandlers(
        LaunchRequestHandler,
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
