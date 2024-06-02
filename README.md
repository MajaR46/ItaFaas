# Event ticket FaaS app

App for ticket selling using FaaS

## Installation

Clone the repository

```bash
git clone https://github.com/MajaR46/ItaFaas
```

Start localstack via Docker
```bash
localstack start
```

Start serverless
```bash
serverless offline --stage local
```

## Endpoints

App is running on  http://localhost:3000
- POST (/local/tickets)
- GET (/local/tickets)
- GET (/local/tickets/{id})
- PUT (/local/tickets/{id})
- DELETE (/local/tickets/{id})


## EVENTS

- Mock Email service when a single ticket is retrieved
- Hourly task of showing number of tickets
- SQS mock
- Change tickets when posted
