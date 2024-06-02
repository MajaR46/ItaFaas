const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer-mock');

const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  endpoint: 'http://127.0.0.1:4566',
});



const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

const extractToken = (headers) => {
  const authHeader = headers.Authorization || headers.authorization;
  if (!authHeader) {
    throw new Error('Authorization header is missing');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Token is missing');
  }
  return token;
};

const payload = {
  userId: '123456',
  name: 'John Doe',
};
const secret = 'faas_key_ita';
const token = jwt.sign(payload, secret, { expiresIn: '1h' });
console.log('Generated JWT Token:', token);

module.exports.createTicket = async (event) => {
  const token = extractToken(event.headers);
  await verifyToken(token);

  const body = JSON.parse(event.body);

  const params = {
    TableName: process.env.TICKETS_TABLE,
    Item: {
      id: uuidv4(),
      event: body.event,
      location: body.location,
      date: body.date,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    console.log('Ticket created successfully');

    await processAndStoreTicket(params.Item);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Ticket created successfully' }),
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

module.exports.getTickets = async (event) => {
  const token = extractToken(event.headers);
  await verifyToken(token);

  const params = {
    TableName: process.env.TICKETS_TABLE,
  };


  try {
    const data = await dynamoDB.scan(params).promise();
    await sendEmail('Tickets Retrieved', 'The tickets have been retrieved successfully.');
    return {
      statusCode: 200,
      body: JSON.stringify(data.Items),
    };
  } catch (error) {
    console.error('Error retrieving tickets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

module.exports.getTicket = async (event) => {
  const token = extractToken(event.headers);
  await verifyToken(token);

  const params = {
    TableName: process.env.TICKETS_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  try {
    const data = await dynamoDB.get(params).promise();
    await sendEmail('One ticket Retrieved', 'The ticket has been retrieved successfully.');
  
    return {
      statusCode: 200,
      body: JSON.stringify(data.Item),
    };
  } catch (error) {
    console.error('Error retrieving ticket:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

module.exports.updateTicket = async (event) => {
  const token = extractToken(event.headers);
  await verifyToken(token);

  const body = JSON.parse(event.body);
  const params = {
    TableName: process.env.TICKETS_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
    UpdateExpression: 'set #event = :event, #location = :location, #date = :date',
    ExpressionAttributeNames: {
      '#event': 'event',
      '#location': 'location',
      '#date': 'date',
    },
    ExpressionAttributeValues: {
      ':event': body.event,
      ':location': body.location,
      ':date': body.date,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  console.log('DynamoDB update params:', params);

  try {
    const data = await dynamoDB.update(params).promise();
    await sendEmail('Tickets Updated', 'The tickets have been updated successfully.');
    return {
      statusCode: 200,
      body: JSON.stringify(data.Attributes),
    };
  } catch (error) {
    console.error('Error updating ticket:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

module.exports.deleteTicket = async (event) => {
  const token = extractToken(event.headers);
  await verifyToken(token);

  const params = {
    TableName: process.env.TICKETS_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  console.log('DynamoDB delete params:', params);

  try {
    await dynamoDB.delete(params).promise();
    await sendEmail('Tickets Deleted', 'The ticket has been deleted successfully.');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Ticket deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

///////////////////////////////MOCK EMAIL /////////////////////////
const sendEmail = async (subject,text) => {
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'christophe.krajcik@ethereal.email',
      pass: 'tr6DsxPeugeAE55V2H'
    }
  });

  let info = await transporter.sendMail({
    from: 'christophe.krajcik@ethereal.email',
    to: 'christophe.krajcik@ethereal.email',
    subject: subject,
    text: text,
  });
  console.log('Message sent: %s', info.messageId);

  const mockSentMessages = nodemailer.mock.getSentMail();
  const sentMessage = mockSentMessages[mockSentMessages.length - 1];

  console.log('Message subject : %s', sentMessage.subject)
  console.log('Message text: %s', sentMessage.text);
};

///////////////NA URO TI IZPIŠE KOLKO JE TICKETOV //////////////////
module.exports.hourlyTask = async () => {
  try {
    const params = {
      TableName: process.env.TICKETS_TABLE,
    };

    const data = await dynamoDB.scan(params).promise();
    const totalTickets = data.Count || 0;

    console.log('Total tickets:', totalTickets);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Hourly task executed successfully', totalTickets }),
    };
  } catch (error) {
    console.error('Error in hourly task:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};


////////////////////////////SQS MESSAGE DEMO/////////////////////

module.exports.handleSQSMessage = async (event) => {
  console.log('SQS Event:', JSON.stringify(event, null, 2));
  for (const record of event.Records) {
    const messageBody = record.body;
    console.log(`Received SQS message: ${messageBody}`);
    // Process the message as needed
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'SQS message processed successfully' }),
  };
};

module.exports.triggerHandleSQSMessage = async (event) => {
  //  mock SQS event
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

  try {
    const response = await module.exports.handleSQSMessage(mockSQSEvent);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Triggered handleSQSMessage successfully', response }),
    };
  } catch (error) {
    console.error('Error triggering handleSQSMessage:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};


////////////////////////////////// TRIGGERED AFTER TICKET IS CREATED //////////
const processAndStoreTicket = async (ticket) => {

  const processedData = {
    id: ticket.id,
    processedEvent: ticket.event.toUpperCase(),
    processedLocation: ticket.location.toLowerCase(), 
    processedDate: new Date(ticket.date).toISOString(), 
  };
  console.log('Processed ticket data:', processedData);
  
  await storeProcessedData(processedData);
};

const storeProcessedData = async (data) => {
  const params = {
    TableName: process.env.TICKETS_TABLE, 
    Item: data,
  };
  
  await dynamoDB.put(params).promise();
  console.log('Processed data stored successfully');
};


