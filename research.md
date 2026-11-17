# FetchQuest research

## Problem in five lines

1. In my hostel, I have noticed classmates such as Abhishek and Rudra needing small purchases from Basti marketplace when they cannot go themselves.
2. Work commitments or feeling unwell can make the trip difficult; I estimate that the marketplace is around 1–1.5 km away.
3. My initial observation is that online ordering can still require going out to receive a delivery, and the extra charges can feel too high for a small purchase.
4. I am focusing on Abhishek, my classmate and a hostel resident, as the person to help; I will confirm his specific need in person.
5. FetchQuest will let him post a small errand for a willing classmate to accept, while observed trip timings help the runner judge whether the trip fits their available time.

## Person, place and evidence status

- **Primary beneficiary:** Abhishek, my classmate and hostel resident. Rudra is another classmate I have noticed facing a similar problem.
- **Place:** My hostel and nearby Basti marketplace.
- **Exact hostel/college and locality:** Hostel k
- **Date of the incident I personally observed:** 17th Nov 
- **Evidence so far:** 7 trips completed 

## Two existing solutions and why they may not fit

### 1. Online convenience delivery such as Swiggy Instamart

Swiggy's official description presents Instamart as delivery of groceries and daily essentials through a dedicated delivery network. It is an existing alternative for someone who cannot visit a shop.
For my person, the possible mismatch is the total cost of a small order and whether the permitted delivery point still requires an inconvenient walk. 

### 2. Asking classmates through a WhatsApp group

My design hypothesis is that a request may be harder to track if acceptance and completion are mixed with ordinary messages. FetchQuest makes those states explicit and assigns only one runner to an open request. I have not yet established that Abhishek's group actually has this problem. I will ask how he currently gets help and whether a group message already works well enough; if it does, I should simplify the tool rather than add an unnecessary app.

## Two source notes


### Source 1 — Swiggy, How India Swiggy'd 2024: Swiggy Instamart Edition

[Official Swiggy article, published 6 January 2025](https://www.swiggy.com/corporate/press-release/how-india-swiggyd-2024-swiggy-instamart-edition/)

1. The article describes an existing service delivering groceries and everyday essentials, so it is relevant to the need for small purchases without personally visiting a market.
2. Its national examples and historical service description do not tell me whether this hostel is covered or what a small order costs here today.
3. I will compare a real basket and collection point locally before claiming FetchQuest is cheaper or more convenient for Abhishek.

### Source 2 — Meta, Find Messages Faster with WhatsApp Chat Filters

[Official Meta article, published 16 April 2024](https://about.fb.com/news/2024/04/whatsapp-chat-filters/)

1. The article explains filters for unread and group conversations, including community subgroups, showing how people can organize existing chats.
2. This is a useful baseline for asking classmates for help, but the article does not establish how errands are managed in my hostel.
3. I will ask whether Abhishek loses track of requests or confirmations in group messages before deciding that a separate request workflow is useful.

## Small tool and personally collected data

The core workflow is to post an item request, let one willing classmate accept it, coordinate the handoff, and mark it complete. The assignment's CSV output is a separate observed-duration report that can help a runner decide whether they have time for the trip.

I plan to collect at least 20 genuine timed errand observations myself. I will define a consistent start/end point, record real timestamps and duration, and preserve how each measurement was made. One-way walks and full shopping round trips must be recorded as different routes. I will not turn test requests, invented timings or repeated copies into fieldwork entries. If 20 genuine observations are impractical within the day, I will revise the measurement plan rather than fabricate data.

The CSV columns are `observation_id, observed_at, place, route, category, duration_minutes, collection_note`. The report groups comparable observations, shows the median and observed range, links the contributing IDs, and reports insufficient data below the sample threshold. It does not promise a delivery time or infer guaranteed savings.

## What I need to learn during the visit

- What was the last small purchase Abhishek needed, and what prevented him from getting it?
- What does he do now, what does it cost, and where must he receive an online order?
- Does asking friends already work? What specifically goes wrong, if anything?
- Would a classmate already travelling to the market be willing to help, and on what terms?
- Would a trip-duration estimate change a runner's decision, or is a simpler output more useful?

The actual conversation, three things the person said, one surprising finding, two timestamped photos, and collection notes belong in `fieldwork.md` .


