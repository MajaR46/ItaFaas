// Import the handler
const { handleSQSMessage } = require('./handler');

// Create a mock SQS event
const mockSQSEvent = {
  Records: [
    {
      messageId: '1',
      receiptHandle: 'MessageReceiptHandle',
      body: JSON.stringify({
        exampleKey: 'exampleValue'
      }),
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: '1523232000000',
        SenderId: '123456789012',
        ApproximateFirstReceiveTimestamp: '1523232000001'
      },
      messageAttributes: {},
      md5OfBody: '098f6bcd4621d373cade4e832627b4f6',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:MyQueue',
      awsRegion: 'us-east-1'
    }
  ]
};

// Invoke the function with the mock event
handleSQSMessage(mockSQSEvent).then(response => {
  console.log('Function response:', response);
}).catch(error => {
  console.error('Function error:', error);
});
