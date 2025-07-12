# Room Availability Logic Analysis

## Current Implementation

The application currently determines room availability based **solely on booking start and end dates**, completely ignoring actual check-in/check-out events tracked in the `CheckInOutLog` table.

### Key Components

#### 1. Dashboard Overview (`src/app/_db/dashboard.ts`)

**Current Logic:**
```typescript
// Get available rooms count
prisma.room.count({
    where: {
        location_id: locationID,
        bookings: {
            none: {
                start_date: {
                    lte: sevenDaysAhead,  // booking starts before week ends
                },
                end_date: {
                    gte: today, // booking ends after week starts
                },
            },
        },
    }
})
```

**How it works:**
- Counts rooms as "available" if they have NO bookings that overlap with the date range
- A room is unavailable if it has any booking where booking starts before period ends AND booking ends after period starts
- **Issue**: Ignores actual check-in/check-out events

#### 2. Room Availability Page (`src/app/(internal)/(dashboard_layout)/rooms/availability/content.tsx`)

**Current Logic:**
```typescript
const hasOverlap = bookingStart < rangeEnd && bookingEnd > rangeStart;
```

**How it works:**
- Uses the same date overlap logic
- Counts rooms as booked if booking dates overlap with selected date range
- **Issue**: Doesn't consider CheckInOutLog events

#### 3. Check-in/Check-out System (`src/app/(internal)/(dashboard_layout)/bookings/booking-action.ts`)

**Current Implementation:**
```typescript
// Handle checkout-specific logic
if (data.action === CheckInOutType.CHECK_OUT) {
    // Update deposit status if provided
    // TODO: Update room status to available (this can be moved to a separate ticket)
}
```

**How it works:**
- Creates `CheckInOutLog` records for check-in/check-out events
- Properly tracks actual tenant check-in/check-out with timestamps
- **Issue**: Has a TODO comment indicating room availability should be updated but it's not implemented

### Database Schema

#### CheckInOutLog Model
```typescript
model CheckInOutLog {
  id         Int      @id @default(autoincrement())
  booking_id Int
  event_type String   @db.VarChar(255)  // "CHECK_IN" or "CHECK_OUT"
  event_date DateTime @db.Date
  tenant_id  String
  
  bookings Booking @relation(fields: [booking_id], references: [id])
  tenant   Tenant  @relation(fields: [tenant_id], references: [id])
}
```

#### Booking Model
```typescript
model Booking {
  id                  Int      @id @default(autoincrement())
  room_id             Int?
  start_date          DateTime @db.Date
  end_date            DateTime @db.Date
  status_id           Int?
  
  checkInOutLogs  CheckInOutLog[]
  // ... other fields
}
```

## Problem Statement

### Current Issue
When a tenant checks out early (before the booking's `end_date`), the room remains marked as **unavailable** until the original booking end date, even though the room is physically available for new bookings.

### Why This Happens
The availability logic only considers `booking.start_date` and `booking.end_date`, completely ignoring the actual checkout events recorded in `CheckInOutLog`.

### Example Scenario
1. **Booking**: Room A from Jan 1-31 (31 days)
2. **Early Checkout**: Tenant checks out on Jan 15 (CheckInOutLog entry created)
3. **Current Behavior**: Room A shows as unavailable until Jan 31
4. **Expected Behavior**: Room A should be available from Jan 15 onwards

## Required Changes

### 1. Modify Available Rooms Count Logic

**Location**: `src/app/_db/dashboard.ts` - `getOverviewData()` function

**Current Logic**: Count rooms with no overlapping bookings
**New Logic**: Count rooms with no overlapping bookings OR bookings that have been checked out

**Implementation Strategy**:
- Check if booking has a checkout event in `CheckInOutLog`
- If checkout exists, use checkout date as effective end date
- If no checkout, use original booking end date

### 2. Update Room Availability Calculation

**Location**: `src/app/(internal)/(dashboard_layout)/rooms/availability/content.tsx` - `calculateRoomAvailability()` function

**Current Logic**: 
```typescript
const hasOverlap = bookingStart < rangeEnd && bookingEnd > rangeStart;
```

**New Logic**:
```typescript
// Get effective end date (checkout date if exists, otherwise booking end date)
const effectiveEndDate = getEffectiveEndDate(booking);
const hasOverlap = bookingStart < rangeEnd && effectiveEndDate > rangeStart;
```

### 3. Create Helper Function for Effective End Date

**New Function**: `getEffectiveEndDate(booking: BookingWithCheckInOutLogs)`

**Logic**:
```typescript
function getEffectiveEndDate(booking: BookingWithCheckInOutLogs): Date {
  // Check if there's a checkout event
  const checkoutEvent = booking.checkInOutLogs?.find(
    log => log.event_type === CheckInOutType.CHECK_OUT
  );
  
  if (checkoutEvent) {
    return checkoutEvent.event_date;
  }
  
  // If no checkout, use original booking end date
  return booking.end_date;
}
```

### 4. Update Database Queries

**Required Changes**:
- Include `checkInOutLogs` in all booking queries used for availability calculations
- Ensure proper joins and filtering based on checkout events

### 5. Update Booking Actions

**Location**: `src/app/(internal)/(dashboard_layout)/bookings/booking-action.ts`

**Current TODO**: 
```typescript
// TODO: Update room status to available (this can be moved to a separate ticket)
```

**Implementation**: This TODO is actually not needed since room availability will be calculated dynamically based on checkout events.

## Implementation Priority

### High Priority Changes
1. **Dashboard availability count** - Most visible to users
2. **Room availability page** - Critical for booking new rooms
3. **Helper function** - Foundation for all availability logic

### Medium Priority Changes
1. **Database query optimization** - Ensure efficient queries with proper indexes
2. **Caching strategy** - Consider caching availability calculations for performance

### Low Priority Changes
1. **API endpoints** - Update any API responses that include availability data
2. **Real-time updates** - Consider WebSocket or polling for real-time availability updates

## Important Notes

### Room Status vs Availability
- **Room Status** (`rooms.status_id`): Physical condition of room (clean, dirty, maintenance, etc.)
- **Room Availability**: Whether room can be booked (based on booking dates and checkout events)
- **Key Point**: Room Status has **no correlation** with availability (as explicitly stated in requirements)

### Data Consistency
- All availability calculations must consistently use the same logic
- Early checkout should immediately reflect in all availability displays
- Need to handle edge cases (multiple checkout events, data inconsistencies)

### Performance Considerations
- Joining `CheckInOutLog` for every availability check may impact performance
- Consider database indexes on `CheckInOutLog.booking_id` and `CheckInOutLog.event_type`
- May need caching strategy for frequently accessed availability data

## Conclusion

The current system properly tracks check-in/check-out events but fails to use this information for availability calculations. The solution requires modifying the availability logic to consider actual checkout events, making rooms available immediately when tenants check out early rather than waiting for the original booking end date.