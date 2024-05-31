const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');


// Configure AWS SDK to use LocalStack
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  endpoint: 'http://127.0.0.1:4566',
});

const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) =>{
      if(err){
        reject(err)
      }else{
        resolve(decoded)
      }
    })
  })
}
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
  console.log('Received event:', event);

  const token = extractToken(event.headers);
  await verifyToken(token)

  const body = JSON.parse(event.body);
  console.log('Parsed body:', body);

  const params = {
    TableName: process.env.TICKETS_TABLE,
    Item: {
      id: uuidv4(),
      event: body.event,
      location: body.location,
      date: body.date,
    },
  };

  console.log('DynamoDB put params:', params);

  try {
    await dynamoDB.put(params).promise();
    console.log('Ticket created successfully');
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
  await verifyToken(token)

  const params = {
    TableName: process.env.TICKETS_TABLE,
  };

  console.log('DynamoDB scan params:', params);

  try {
    const data = await dynamoDB.scan(params).promise();
    console.log('Tickets retrieved successfully:', data.Items);
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
  await verifyToken(token)

  const params = {
    TableName: process.env.TICKETS_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  console.log('DynamoDB get params:', params);

  try {
    const data = await dynamoDB.get(params).promise();
    console.log('Ticket retrieved successfully:', data.Item);
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
  await verifyToken(token)

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
    console.log('Ticket updated successfully:', data.Attributes);
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
  await verifyToken(token)


  const params = {
    TableName: process.env.TICKETS_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  console.log('DynamoDB delete params:', params);

  try {
    await dynamoDB.delete(params).promise();
    console.log('Ticket deleted successfully');
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
