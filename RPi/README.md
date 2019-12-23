# ControlMyPi Raspberry Pi Code
The Python code running on the Raspberry Pi utilizes the AWS SDK to communicate with AWS IoT. The code simply subscribes to topics and will publish to specific topics if receiving specific commands. In order to get this code correctly running on the Raspberry Pi, you will need to do the following:
1. Onboard The Device
2. Upload credentials to Raspberry Pi
3. Ensure correct policy permissions
4. Modify ```start.sh``` script to run the correct code
5. Run the start.sh script
6. Verify commands

## Onboard the Device
![Onboarding 1](/images/aws-iot-onboard-device-1.png)

![Onboarding 2](/images/aws-iot-onboard-device-2.png)

![Onboarding 3](/images/aws-iot-onboard-device-3.png)

![Onboarding 4](/images/aws-iot-onboard-device-4.png)

![Onboarding 5](/images/aws-iot-onboard-device-5.png)

![Onboarding 6](/images/aws-iot-onboard-device-6.png)

## Upload Credentials to Raspberry Pi
As mentioned in the previous step, the onboarding device process creates a set of files that enable the Raspberry Pi to communicate with AWS IoT. The following files will need to be uploaded to this directory where the python code runs.
- ControlMyPi.cert.pem
- ControlMyPi.private.key
- ControlMyPi.public.key
- start.sh

## Ensure Correct Policy Permissions
In order for the MQTT messages to be correctly sent and received, we need to make sure that the AWS actions/resources have the correct permissions.

Update the provided ControlMyPi-Policy.json with your specific region and account and paste into the policy document under:
```AWS->Manage->Things->< YourThingName >->Security->< YourCertificate# >->Policies->< YourPolicyName >```

## Modify start.sh script to run the correct code
The script file launches example code from the SDK as shown below.

```python aws-iot-device-sdk-python/samples/basicPubSub/basicPubSub.py -e <your-aws-iot-endpoint>.amazonaws.com -r root-CA.crt -c ControlMyPi.cert.pem -k ControlMyPi.private.key```

We need to replace the example code with the code in this directory as shown below.

```python aws_iot_pubsub.py -e <your-aws-iot-endpoint>.amazonaws.com -r root-CA.crt -c ControlMyPi.cert.pem -k ControlMyPi.private.key```

As mentioned in the final step of the onboarding process, you will need to add execution permissions to start.sh as shown below
```chmod +x start.sh```

## Run the start.sh script
We run the script by executing the following code.
```./start.sh```

If everything is working correctly, we should see the following output on the Rapsberry Pi.

![RPi Output](/images/rpi-code-startup.png)

## Verify Commands
If the RPi is running correctly, we should see the following after initiating the following commands.

```set direction of pin 18 to output```

![RPi Output](/images/rpi-code-set-direction.png)

```set pin 18 to high```

![RPi Output](/images/rpi-code-set-level.png)
