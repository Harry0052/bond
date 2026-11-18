# Bond pilot plan

This plan has not been run. No decision to ship, iterate, or stop can be made from observed behavior yet. The app is not claimed to be ready for a public launch.

## Who

10 to 30 people who already make small plans in a group chat: roommates, a class group, a couple, or friends organizing one trip or purchase. Do not recruit by uploading a contacts list. Each person gets a link from someone they already know.

## What they do

1. One person makes a bond in under a minute: a title, why, the other people's names, and at least one commitment with a time.
2. They copy the link into the group chat themselves. Bond does not send it.
3. Each invited person opens the link, reads the card, and either accepts the commitments on their name or declines.
4. Someone marks a commitment done, or the organizer changes a time so the group can see that the old acceptance no longer counts.
5. A few days later, the same organizer either makes another bond or says they went back to the chat.

## What to record

- Did the organizer finish creating a bond?
- Of the people who were sent the link, how many opened it and how many accepted? The early invalidation signal in the brief is fewer than 30% joining.
- Did at least two people accept within 48 hours? That is the north-star count in `src/lib/metrics.ts`.
- Did anyone create a second bond?
- Where did they get stuck: the link, the name, the time, or not trusting that it was not a contract?
- Quotes about confusion. Do not invent testimonials.

## What not to measure

Do not count sample bonds. Do not treat a reminder as sent email or SMS. Do not describe an acceptance as a legal agreement or a payment.

## Decision after the pilot

- Ship a wider test only if people complete the link flow and at least some groups come back.
- Iterate if they understand the card but drop off at the join step.
- Stop if invited people do not join and say the group chat was easier.

Until those notes exist, the decision is: not run, so not ready to ship.
