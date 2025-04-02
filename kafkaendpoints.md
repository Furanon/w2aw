# Kafka Endpoints Documentation

## Overview

This document provides comprehensive information about the Kafka integration in our application, including all available endpoints, health monitoring capabilities, consumer metrics, and API routes.

## Table of Contents

- [Endpoints](#endpoints)
- [Health Monitoring](#health-monitoring)
- [Consumer Metrics](#consumer-metrics)
- [API Routes](#api-routes)
- [Examples](#examples)

## Endpoints

### Kafka Consumer Endpoint

**Route**: `/api/kafka-consumer`

**Method**: POST

**Description**: Processes incoming Kafka messages and routes them to the appropriate handlers.

**Request Body**:
```json
{
  "topic": "string",
  "message": "object"
}
```

**Response**:
- `200 OK`: Message processed successfully
- `400 Bad Request`: Invalid request format
- `500 Internal Server Error`: Processing error

### Kafka Consumers List

**Route**: `/api/kafka/consumers`

**Method**: GET

**Description**: Returns a list of all active Kafka consumers with their status.

**Response**:
```json
{
  "consumers": [
    {
      "id": "string",
      "groupId": "string",
      "topic": "string",
      "status": "RUNNING|PAUSED|ERROR",
      "lastProcessed": "timestamp",
      "messageCount": "number"
    }
  ]
}
```

### Kafka Consumer Status

**Route**: `/api/kafka/consumers/:id`

**Method**: GET

**Description**: Returns detailed status information for a specific consumer.

**Response**:
```json
{
  "id": "string",
  "groupId": "string",
  "topic": "string",
  "status": "RUNNING|PAUSED|ERROR",
  "lastProcessed": "timestamp",
  "messageCount": "number",
  "errors": "array",
  "lag": "number",
  "partitions": "array"
}
```

### Kafka Consumer Control

**Route**: `/api/kafka/consumers/:id/control`

**Method**: POST

**Description**: Controls a specific consumer's operation (pause, resume, reset).

**Request Body**:
```json
{
  "action": "PAUSE|RESUME|RESET"
}
```

**Response**:
- `200 OK`: Action performed successfully
- `400 Bad Request`: Invalid action
- `404 Not Found`: Consumer not found
- `500 Internal Server Error`: Action failed

## Health Monitoring

The health monitoring system provides real-time information about the status and performance of Kafka consumers.

### Health Check Endpoint

**Route**: `/api/kafka/consumers/health`

**Method**: GET

**Description**: Returns the health status of all Kafka consumers.

**Response**:
```json
{
  "status": "HEALTHY|DEGRADED|UNHEALTHY",
  "consumers": [
    {
      "id": "string",
      "status": "HEALTHY|DEGRADED|UNHEALTHY",
      "metrics": {
        "lag": "number",
        "processRate": "number",
        "errorRate": "number"
      }
    }
  ]
}
```

### Health Status Definitions

| Status | Description |
|--------|-------------|
| HEALTHY | All consumers are processing messages normally with acceptable lag |
| DEGRADED | Some consumers have increased lag or error rates, but are still functioning |
| UNHEALTHY | One or more critical consumers have failed or have unacceptable performance |

## Consumer Metrics

Kafka consumers report the following metrics:

### Lag

The number of messages that have been produced but not yet consumed. High lag indicates potential processing bottlenecks.

**Thresholds**:
- `0-100`: Normal
- `101-1000`: Warning
- `>1000`: Critical

### Process Rate

The number of messages processed per second.

**Thresholds**:
- Varies by consumer type and expected load

### Error Rate

The percentage of messages that result in processing errors.

**Thresholds**:
- `0-1%`: Normal
- `1-5%`: Warning
- `>5%`: Critical

### Consumer Status Definitions

| Status | Description |
|--------|-------------|
| RUNNING | Consumer is actively processing messages |
| PAUSED | Consumer has been manually paused and is not processing messages |
| ERROR | Consumer has encountered errors and may not be processing messages correctly |

## API Routes

### Notification System Integration

**Route**: `/api/notifications`

**Method**: POST

**Description**: Sends notifications via Kafka to targeted users.

**Request Body**:
```json
{
  "userId": "string",
  "type": "EVENT|SYSTEM|ALERT",
  "title": "string",
  "message": "string",
  "data": "object"
}
```

**Response**:
- `200 OK`: Notification sent successfully
- `400 Bad Request`: Invalid notification format
- `500 Internal Server Error`: Failed to send notification

### Event Streaming

**Route**: `/api/events`

**Method**: POST

**Description**: Publishes events to Kafka for real-time processing.

**Request Body**:
```json
{
  "eventType": "string",
  "timestamp": "string",
  "data": "object"
}
```

**Response**:
- `200 OK`: Event published successfully
- `400 Bad Request`: Invalid event format
- `500 Internal Server Error`: Failed to publish event

## Examples

### Subscribing to Event Updates

```javascript
// Client-side code
async function subscribeToEvents(eventType) {
  const response = await fetch('/api/kafka/consumers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: 'events',
      filter: { eventType }
    }),
  });
  
  const { consumerId } = await response.json();
  return consumerId;
}
```

### Publishing Calendar Event Updates

```javascript
// Server-side code
async function publishCalendarUpdate(eventId, updateData) {
  const producer = kafka.producer();
  await producer.connect();
  
  await producer.send({
    topic: 'calendar-updates',
    messages: [
      { 
        key: eventId,
        value: JSON.stringify(updateData)
      }
    ],
  });
  
  await producer.disconnect();
}
```

### Handling Consumer Health Alerts

```javascript
// Health monitoring service
async function monitorConsumerHealth() {
  const response = await fetch('/api/kafka/consumers/health');
  const healthData = await response.json();
  
  if (healthData.status !== 'HEALTHY') {
    for (const consumer of healthData.consumers) {
      if (consumer.status !== 'HEALTHY') {
        await sendAlert(`Consumer ${consumer.id} is ${consumer.status.toLowerCase()}`);
      }
    }
  }
}
```

