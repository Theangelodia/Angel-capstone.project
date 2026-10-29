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
