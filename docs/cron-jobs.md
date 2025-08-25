# HMS Cron Jobs Documentation

This document describes all the automated cron jobs in the HMS (Hotel Management System) and how they work together to manage the billing and notification lifecycle.

## Overview

The HMS system uses several cron jobs to automate critical business processes:
- **Monthly Billing**: Generates new monthly bills for rolling bookings
- **Email Reminders**: Sends payment reminders for upcoming bills

## Cron Job Schedule

| Job | Schedule | Purpose | Endpoint |
|-----|----------|---------|----------|
| Monthly Billing | `0 0 1 * *` (1st of every month) | Generate new monthly bills | `/api/cron/monthly-billing` |
| Email Reminders | `0 0 28 * *` (28th of every month) | Send payment reminders | `/api/tasks/email/invoice-reminder` |


## 1. Monthly Billing Cron

### Purpose
Automatically generates monthly bills for all active rolling bookings on the 1st of each month.

### How It Works
1. **Fetches Active Bookings**: Finds all rolling bookings without end dates
2. **Generates Next Bills**: Calls `generateNextMonthlyBill` for each booking
3. **Creates Bills**: Inserts new bills into the database
4. **Reports Results**: Provides summary of processed bookings and created bills

### Endpoint
```
POST /api/cron/monthly-billing
```

### Authentication
Uses `CRON_SECRET` environment variable for authentication.

### Response
```json
{
  "message": "Successfully processed 5 bookings and created 3 new bills.",
  "summary": {
    "totalBookingsProcessed": 5,
    "newBillsCreated": 3,
    "processedDate": "2024-09-01T00:00:00.000Z"
  },
  "processedBookings": [
    {
      "bookingId": 123,
      "tenantName": "John Doe",
      "roomName": "A101",
      "status": "processed",
      "billId": 456,
      "billDescription": "Tagihan untuk Bulan September 2024"
    }
  ]
}
```

### Billing Logic
- **First Month**: Creates prorated bill from start date to end of month
- **Subsequent Months**: Creates full monthly bills up to current month
- **Current Month Only**: `generateNextMonthlyBill` only creates bills for the current month
- **No Gaps**: `generateInitialBillsForRollingBooking` handles historical gaps during booking creation

### Example Timeline
```
July 15: Guest checks in (rolling booking)
July 15: generateInitialBillsForRollingBooking creates:
         - July bill (prorated, due July 31)
         - August bill (full, due August 31)

August 1: Monthly billing cron runs
         - Creates September bill (due September 30)

September 1: Monthly billing cron runs
         - Creates October bill (due October 31)
```

## 2. Email Reminder Cron

### Purpose
Sends payment reminders to tenants for bills due within the next 7 days.

### How It Works
1. **Finds Upcoming Bills**: Identifies bills due in the next 7 days
2. **Generates Emails**: Creates email content using templates
3. **Sends Reminders**: Delivers emails to tenant email addresses
4. **Reports Results**: Provides summary of sent emails

### Endpoint
```
GET /api/tasks/email/invoice-reminder
```

### Authentication
Uses `CRON_SECRET` environment variable for authentication.

### Email Template
```
Yth. [Tenant Name],

Kami ingin mengingatkan bahwa tagihan [Bill ID] sebesar [Amount] jatuh tempo pada [Due Date]. 
Mohon segera lakukan pembayaran sebelum tanggal tersebut.

Pembayaran dapat dilakukan melalui transfer ke rekening dibawah:
BCA 
5491118777 
Adriana Nugroho

Jika pembayaran sudah dilakukan, harap abaikan email ini.

Terima kasih,
MICASA Suites
```

### Reminder Logic
- **7-Day Window**: Sends reminders for bills due in the next 7 days
- **Unpaid Only**: Only sends reminders for unpaid bills
- **Email Required**: Skips tenants without email addresses
- **Batch Processing**: Processes emails in batches of 50 for performance

### Example Timeline
```
September 28: Email reminder cron runs
             - Finds September bill due September 30 (2 days away)
             - Sends reminder email to tenant

September 30: Bill due date
             - Tenant should have paid by now
```



## Debug Endpoints

For testing and debugging cron jobs without affecting production data, use these debug endpoints.

### Authentication
All debug endpoints require authentication. You must be logged in to the HMS system to access these endpoints.

### Monthly Billing Debug

**Endpoint:** `GET /api/debug/cron/monthly-billing`

**Purpose:** Simulate the monthly billing cron job without actually creating bills in the database.

**Query Parameters:**
- `target_date` (optional): Custom date to simulate billing for. Format: `YYYY-MM-DD`. Defaults to current date.

**Example Usage:**
```bash
# Test with current date
curl "http://localhost:3000/api/debug/cron/monthly-billing" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Test with specific date (e.g., simulate what would happen on September 1st)
curl "http://localhost:3000/api/debug/cron/monthly-billing?target_date=2024-09-01" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "targetDate": "2024-09-01T00:00:00.000Z",
    "totalBookingsProcessed": 5,
    "wouldCreateBills": 3,
    "noBillNeeded": 2,
    "errors": 0
  },
  "simulationResults": [
    {
      "bookingId": 123,
      "tenantName": "John Doe",
      "roomName": "A101",
      "roomType": "Standard",
      "fee": 2000000,
      "status": "would_create_bill",
      "billDescription": "Tagihan untuk Bulan September 2024",
      "existingBillsCount": 2,
      "latestBillDueDate": "2024-08-31T00:00:00.000Z",
      "nextBillStartDate": "2024-09-01T00:00:00.000Z"
    }
  ],
  "message": "Simulation completed for 2024-09-01. Would create 3 new bills."
}
```

### Email Reminder Debug

**Endpoint:** `GET /api/debug/tasks/email/invoice-reminder`

**Purpose:** Simulate the email reminder cron job without actually sending emails.

**Query Parameters:**
- `start_date` (optional): Custom date to simulate reminders for. Format: `YYYY-MM-DD`

**Example Usage:**
```bash
# Test with current date
curl "http://localhost:3000/api/debug/tasks/email/invoice-reminder" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Test with specific date
curl "http://localhost:3000/api/debug/tasks/email/invoice-reminder?start_date=2024-09-28" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Cron Job Dependencies

### Monthly Billing → Email Reminders
The monthly billing cron creates bills that the email reminder cron will later remind about.

### Data Flow
```
1. Monthly Billing Cron (1st of month)
   ↓ Creates bills
2. Bills exist in system
   ↓ Available for reminders
3. Email Reminder Cron (28th of month)
   ↓ Sends reminders
4. Tenants receive notifications
   ↓ Can make payments
```

## Configuration

### Environment Variables
```bash
# Required for cron authentication
CRON_SECRET=your-secret-key

# HMS API configuration
HMS_BASE_URL=http://localhost:3000
HMS_CRON_SECRET=your-secret-key

# Email configuration
MONTHLY_INVOICE_EMAIL_REMINDER_ENABLED=true
```

### Settings Table
The email reminder cron checks the `settings` table for:
- `MONTHLY_INVOICE_EMAIL_REMINDER_ENABLED`: Controls whether reminders are sent

## Monitoring and Logging

### Log Locations
- **Application Logs**: `logs/hms/`
- **Cron Logs**: `logs/`
- **Database Logs**: Check Prisma logs

### Key Metrics to Monitor
1. **Monthly Billing Success Rate**: How many bills were created vs. expected
2. **Email Delivery Rate**: How many reminder emails were sent successfully
3. **Error Rates**: Any failures in cron job execution
4. **Processing Time**: How long each cron job takes to complete

### Troubleshooting

#### Common Issues

1. **Monthly Billing Fails**
   - Check if rolling bookings exist
   - Verify database connectivity
   - Check for errors in `generateNextMonthlyBill` function

2. **Email Reminders Not Sent**
   - Verify `MONTHLY_INVOICE_EMAIL_REMINDER_ENABLED` setting
   - Check if tenants have email addresses
   - Verify SMTP configuration

3. **Cron Jobs Not Running**
   - Check cron daemon status
   - Verify cron schedules
   - Check system logs for errors

#### Debug Steps

1. **Use Debug Endpoints**: Test cron logic without affecting production
2. **Check Logs**: Review application and cron logs for errors
3. **Verify Data**: Ensure required data exists (bookings, tenants, etc.)
4. **Test Manually**: Run cron endpoints manually to verify functionality

## Best Practices

1. **Test First**: Always use debug endpoints before running production crons
2. **Monitor Results**: Check cron job results and logs regularly
3. **Backup Data**: Ensure database backups before major cron operations
4. **Error Handling**: Implement proper error handling and notifications
5. **Performance**: Monitor cron job execution times and optimize if needed

## Security Considerations

1. **Authentication**: All cron endpoints use `CRON_SECRET` for authentication
2. **Debug Endpoints**: Protected by user authentication, not accessible to cron jobs
3. **Data Access**: Cron jobs only access necessary data for their specific purpose
4. **Logging**: All cron operations are logged for audit purposes
