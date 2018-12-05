const channelType = "EMAIL";
const pinpoint = new Pinpoint({ region: awsmobile.aws_pinpoint_region });
pinpoint
  .updateEndpoint({
    ApplicationId: "your-pinpoint-application-id-here",
    EndpointId: "your-generated-endpoint-id-here",
    EndpointRequest: {
      Address: email,
      ChannelType: channelType,
      OptOut: "NONE",
      Demographic: pinpointDemographics(),
      User: {
        UserId: identityId,
        UserAttributes: {}
      }
    }
  })
  .promise();
