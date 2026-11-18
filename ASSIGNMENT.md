# FetchQuest assignment completion guide

## Local problem to validate

The project owner reports that Abhishek and Rudra, classmates in the hostel, sometimes need small purchases from Basti marketplace but cannot go because of work or poor health. The reported distance is 1–1.5 km. The owner also reports that online ordering can still require walking to collect the delivery and can cost too much for a small order.

These statements came from the owner in this AI chat. They are not interview quotes, measured distances, verified prices, or completed fieldwork. Choose one person, get their agreement, and confirm what actually helps them. Do not record private health details in the public repository.

## Collect observations

Spend at least 20 minutes at the relevant hostel/market location, take two timestamped photos with permission, and personally speak with your chosen person. Record name, role, three things they actually said, and one thing that surprised you. Preserve actual dates and locations.

For the timing report, collect at least 20 genuine timed errand records. Define a consistent start and end (for example, leaving the hostel common gate and returning there after shopping). Observe consenting runners and record actual start/end times. Keep raw measurement notes that explain the derived duration. Use distinct IDs, preserve variations and gaps, and group different directions or tasks separately. Do not retrospectively guess durations or treat planned tasks as completed observations. If 20 genuine records cannot be collected within the deadline, narrow/change the data-driven tool rather than fabricate entries.

Populate `data.csv` using its existing header. Keep personal names out of row IDs. Record enough place/time/source detail to explain any row during the evaluator call. App users, test accounts, generated fixtures and demonstration requests do not count as field data.

## Submission checklist

- [ ] Confirm the problem was personally observed in the last week and is within walking distance.
- [ ] Pick one named beneficiary; test the output with that person.
- [ ] Complete `research.md`: five-line problem, two existing solutions and why they do not fit, two sources YOU actually read with three-line notes each.
- [ ] Complete `fieldwork.md` from YOUR visit, conversation and two timestamped photos.
- [ ] Add at least 20 genuine entries and explain collection in fieldwork notes.
- [ ] Run `npm run report`; correct invalid rows and inspect supporting observation IDs.
- [ ] Update README with actual report output, what it helped decide, and what it got wrong.
- [ ] Write `reflection.md` yourself without AI: initial mistakes, what you would cut, where AI helped and wasted time. No reflection draft has been generated.
- [ ] Record three minutes of the tool running and link it in README.
- [ ] Export the actual AI conversations used into `ai-chats/`; inspect for credentials/private details before publishing.
- [ ] Use a public Git repository; first commit within the assignment's first hour should be your research/person choice. Make at least five meaningful commits across the day, with your own messages.
- [ ] Do not manufacture commit dates or describe this pre-existing frontend as newly built during the assignment. Clarify reuse with the evaluator if needed.
- [ ] Email the repository link within 24 hours yourself.

## Practice the evaluator call

Open an observation ID and explain where/when/how it was recorded. Demonstrate an invalid row using a COPY of the CSV, then restore genuine data. Change `--min-samples` on the CLI or `MIN_ROUTE_SAMPLES` for the server and explain why the estimate disappears below the threshold. Explain why weather, queues or a different route could invalidate an estimate. Be ready to modify code, not only change configuration.

## Files intentionally not completed by AI

A draft `research.md` is now supplied from the owner's observations and two official sources. The owner still needs to fill in actual place/date details, read the sources personally and verify its claims. No completed `fieldwork.md`, `reflection.md`, photos, real measurement rows, demo recording, or chat export is supplied. These guides are not substitutes for those deliverables.
