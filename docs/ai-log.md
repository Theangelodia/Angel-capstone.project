## Build 1

### Prompt 1: Build 1 prompt (docs/build-1.md)

- **What I asked:** Implement the event-ticketing domain, including ID and booking-reference generation, ticket inventory, booking and cancellation, booking lookup, a FIFO waitlist, a demo script, and a lookup benchmark.
- **What came back:** Domain modules for errors, IDs, inventory, and the waitlist queue, plus scripts to demonstrate the booking workflow and compare `Map.get()` with `Array.find()`.
- **What was wrong (or "nothing"):** The error module was initially saved as `error.js` instead of `errors.js`, causing an `ERR_MODULE_NOT_FOUND` error. I renamed it to match the import path and reran the demo successfully. Automated tests still needed to be run.

### Prompt 2: Automated tests for Build 1

- **What I asked:** Create automated tests for ticket inventory, booking, cancellation, booking lookup, validation, and the FIFO waitlist.
- **What came back:** A test file using Node.js's built-in test runner with nine tests covering the main booking and queue behaviours.
- **What was wrong (or "nothing"):** The test file was initially missing, and the first test command ran zero tests. After creating the test file and correcting its import paths, all nine tests passed.


## Build 2

### Prompt 1: Build 2 prompt (`docs/build-2.md`)

- **What I asked:**  
  I asked the AI to help implement Build 2 of the Event Ticketing capstone. This included writing a stable merge sort, adding event publishing and public event summaries, implementing event search, filtering and sorting, and writing automated tests using `node:test` and `node:assert/strict`.

- **What came back:**  
  The AI helped implement `src/domain/sorting.js`, `src/domain/eventSearch.js`, and updates to `src/domain/inventory.js`. It also helped create and update tests for sorting, event search, event creation, publishing and ticket booking.

- **What was wrong (or "nothing"):**  
  Some existing booking tests failed because the events were still drafts, while the updated booking function only allowed bookings for published events. I fixed this by publishing the events in the relevant test setups. I also checked the booking status and confirmed that new bookings use `pending`. During verification, I changed the unknown-event error code from `EVENT_NOT_FOUND` to `NOT_FOUND` to match the Build 2 acceptance criteria. After these changes, all 33 tests passed.

### Prompt 2: Testing and verification

- **What I asked:**  
  I asked the AI to guide me through checking the test results, correcting failing tests, reviewing Git changes, and committing and pushing my Build 2 work to GitHub.

- **What came back:**  
  The AI guided me through fixing the failing tests, reviewing staged files, excluding unrelated practice files from the commit, and committing and pushing the changes to the `main` branch.

- **What was wrong (or "nothing"):**  
  Some unrelated practice files were initially staged alongside the Build 2 files. I unstaged those files without deleting them, then committed and pushed the intended Build 2 changes. The commit was successful, and all 33 tests passed. I still need to verify every acceptance criterion in the Build 2 brief and confirm that the required documentation is complete.

## Build 3

### Prompt 1: Architecture, booking state machine and server

- **What I asked:**  
  I asked the AI to guide me through implementing Build 3 of the Event Ticketing capstone. This included documenting the system architecture, creating a booking state machine, building a small HTTP router and server using Node.js built-in modules, serving static files safely, and adding automated tests.

- **What came back:**  
  The AI helped implement `src/domain/bookingStateMachine.js`, `src/http/router.js`, `src/http/app.js`, `src/config.js`, and `src/server.js`. It also helped create tests for booking transitions, routing, and HTTP server behaviour, and update `docs/architecture.md`.

- **What was wrong (or "nothing"):**  
  During testing, the malformed JSON test initially returned a 404 instead of the expected 400. I corrected the request-processing order so that JSON is parsed before checking whether an API route exists. All 51 automated tests then passed. I also tested the health endpoint, static file serving, unknown API routes, and path-traversal protection successfully.

### Prompt 2: Regression testing and demo correction

- **What I asked:**  
  I asked the AI to guide me through running the existing Build 2 demo and benchmark to ensure the new server work had not broken earlier functionality.

- **What came back:**  
  The benchmark ran successfully, but the demo initially failed because the event was not published before ticket booking. The AI helped me identify the existing `publishEvent()` function and add it to the demo after creating the ticket tier.

- **What was wrong (or "nothing"):**  
  I initially placed the `publishEvent()` call before creating the ticket tier. This caused an `INVALID_STATE` error because an event must have at least one ticket tier before it can be published. I moved the call to the correct position. The demo then completed successfully, including booking, sold-out handling, cancellation, and waitlist operations.

  
## Build 4 – Working REST API

### Work completed
- Implemented an in-memory repository for application data.
- Added event creation, ticket tier creation, publishing and unpublishing.
- Connected event search and filtering to the REST API.
- Implemented ticket booking and booking ownership using the `x-user-id` header.
- Added a mock payment gateway for successful and declined payments.
- Implemented unpaid booking cancellation.
- Added consistent JSON error responses.
- Created API-level tests using a real HTTP server.
- Documented API requests in `docs/api-examples.md`.

### Testing
- Existing Build 3 tests continued to pass.
- Added four Build 4 API tests.
- Latest test result: 55 tests passed, 0 failed.

### AI assistance and corrections
- AI helped structure the repository, services, routes and API tests.
- Initial repository and service implementations needed corrections to work with the existing inventory domain.
- Event search mapping was adjusted to include the event details and ticket tiers required by the search module.
- API tests were added to verify event creation, publishing, searching, booking, payment retry, ownership and cancellation.

### Reflection
Build 4 helped me understand how the domain logic connects to HTTP endpoints and how a client can interact with an application through a REST API.
