# Lambda Function Details

## Steps to Create
### 1. Create Function

![Create Lambda](/images/lambda-create-function.png)

### 2. Author from scratch
![Lambda Function Details](/images/lambda-create-function-details.png)

## Add Layer
In order to include the dependencies, we need to include these packages. The necessary packages are included in nodejs.zip.

### Details for Layer
![Lambda Layer Details](/images/lambda-layer-details.png)

## Copy and paste code into AWS editor
We need to paste the index.js code from this repository into the AWS Lambda IDE as shown below.

![Copy Lambda Code](/images/lambda-paste-code.png)

There are probably more elegant ways to do this manual process but this works for now.

## Add Your Endpoint to Environment Variable
In order for our Lambda function to access AWS IoT, we need to add our endpoint to the environment variable, AWS_IOT_ENDPOINT, as shown below.

![Add AWS_IOT_ENDPOINT environment variable](/images/lambda-set-environment-variable.png)

Environment variables are accessed in the code prefaced by ```process.env.```
