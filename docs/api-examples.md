
# Build 4 API Examples

The API runs locally using:

```bash
npm start
```

Base URL: `http://localhost:3000`

For booking and payment requests, include the `x-user-id` header.

## 1. Create an event

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "NextGenSound Live",
    "city": "Lagos",
    "venue": "Ikeja",
    "date": "2027-01-15"
  }'
```

Copy the event `id` from the response.

## 2. Add a ticket tier

Replace `EVENT_ID` with the event ID.

```bash
curl -X POST http://localhost:3000/api/events/EVENT_ID/tiers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regular",
    "priceCents": 500000,
    "capacity": 100
  }'
```

Copy the tier `id` from the response.

## 3. Publish the event

```bash
curl -X POST http://localhost:3000/api/events/EVENT_ID/publish
```

## 4. Search published events

```bash
curl "http://localhost:3000/api/events?city=Lagos"
```

Other supported filters include `q`, `from`, `to`, `maxPriceCents`, and `onlyAvailable`. Sorting can use `sort=date`, `sort=price`, or `sort=availability`.

## 5. Book tickets

Replace `EVENT_ID` and `TIER_ID` with the IDs returned earlier.

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -d '{
    "eventId": "EVENT_ID",
    "tierId": "TIER_ID",
    "customerName": "Angel",
    "quantity": 2
  }'
```

Copy the booking `reference` from the response.

## 6. Simulate successful payment

Replace `BOOKING_REFERENCE` with the booking reference.

```bash
curl -X POST http://localhost:3000/api/bookings/BOOKING_REFERENCE/pay \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -d '{"shouldDecline": false}'
```

## 7. Simulate declined payment

```bash
curl -X POST http://localhost:3000/api/bookings/BOOKING_REFERENCE/pay \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -d '{"shouldDecline": true}'
```

A declined payment leaves the booking pending so payment can be retried.

## 8. Cancel an unpaid booking

```bash
curl -X POST http://localhost:3000/api/bookings/BOOKING_REFERENCE/cancel \
  -H "x-user-id: user-1"
```

Only pending bookings can be cancelled through this endpoint.

## Error response format

API errors use a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION",
    "message": "A description of the error"
  }
}
```
