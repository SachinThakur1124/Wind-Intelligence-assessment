# Wind Intelligence — 10-Minute Video Demo Script & Checklist

This document provides a concise, natural speaking script and screen-by-screen checklist for recording the mandatory 10-minute presentation.

---

## Recording Checklist & Setup
- **Screen Resolution**: 1920x1080 (1080p), browser zoom set to 100%.
- **Browser**: Chrome/Edge opened to `http://localhost:5173` (or deployed URL).
- **Terminal 1**: Running backend (`uvicorn app.main:app`).
- **Terminal 2**: Running frontend (`npm run dev`).
- **Terminal 3**: Ready to execute `pytest tests -v` and `npm run test`.
- **Theme**: Start in Light theme, toggle to Dark theme during UI tour.

---

## Video Outline & Timing

| Section | Topic | Allocated Time | Target Cumulative |
| :--- | :--- | :--- | :--- |
| **Part 1: Customer Presentation** | Business Problem & Objective | 0:45 | 0:45 |
| | January 2026 Dashboard & KPIs | 1:15 | 2:00 |
| | Forecast vs Actual Chart & Error Analysis | 1:30 | 3:30 |
| | Revision Explorer & Decision Cutoff | 1:00 | 4:30 |
| | Decision Context & Procurement Disclaimer | 0:30 | 5:00 |
| **Part 2: Technical Lead Review** | Architecture Overview & Tech Stack | 1:00 | 6:00 |
| | Elexon Data Pipeline & Cutoff Selection Engine | 1:30 | 7:30 |
| | Statistical Metric Calculations & Validation | 1:00 | 8:30 |
| | Automated Test Suite Run & Verifications | 0:45 | 9:15 |
| | Caching, Docker, Deployment & Limitations | 0:45 | 10:00 |

---

## Part 1: Customer / Business Presentation (0:00 – 5:00)

### [0:00 – 0:45] The Business Problem
> **Action**: Show the header of Wind Intelligence dashboard.
>
> **Script**:
> *"Hello everyone. Today I'm presenting **Wind Intelligence**, an energy analytics platform built specifically for Great Britain wholesale electricity utilities.
> 
> As an energy utility buying power from the day-ahead wholesale market, one of our biggest financial risks is renewable intermittency. In the UK, trading desks must commit to electricity procurement contracts before wholesale auction gate closure on the day prior to delivery.
> 
> If we overestimate wind generation, we under-procure thermal or baseload power and face expensive imbalance cashout prices in real time. If we underestimate wind, we over-procure and are forced to sell excess power back at distress prices.
> 
> To solve this, Wind Intelligence answers two critical questions:
> 1. What wind generation forecast was actually available when our day-ahead purchase decision needed to be made?
> 2. How accurate was that forecast compared to the actual metered national wind generation?"*

---

### [0:45 – 2:00] January 2026 Cohort & Executive KPIs
> **Action**: Hover over the KPI cards (Forecast Average, Actual Average, MAE, RMSE, Bias, WAPE).
>
> **Script**:
> *"Here on the dashboard, we are evaluating the entire **January 2026 purchase decision cohort**, covering 1,488 half-hourly settlement periods from January 2nd through February 1st.
>
> Looking at our top KPI cards:
> - Our **Forecast Average** was **13,013 MW**, while our **Actual Outturn Average** was **11,284 MW**.
> - The **Mean Absolute Error (MAE)** was **2,016 MW**, which represents our average expected volumetric miss for any half-hour.
> - The **Root Mean Squared Error (RMSE)** was **2,510 MW**. Notice that RMSE is higher than MAE because it heavily penalizes large forecast misses that lead to grid balancing spikes.
> - Crucially, look at **Forecast Bias**: it is **+1,730 MW**. Under our standard sign convention (Forecast minus Actual), positive bias indicates **systematic overforecasting**. Throughout January 2026, the available day-ahead forecast was consistently projecting more wind than the country actually generated.
> - Our **WAPE (Weighted Absolute Percentage Error)** stands at **17.9%**, across **100% data coverage** with zero missing intervals."*

---

### [2:00 – 3:30] Forecast vs Actual Chart & Error Analysis
> **Action**: Scroll to the Time Series chart. Click between 'Jan 2-8' and 'Full Cohort'. Hover over a peak to show the tooltip with signed error. Then show the Signed Error timeline and Diurnal Profile tabs.
>
> **Script**:
> *"Moving down to our interactive time-series chart:
> The blue line shows the Day-Ahead Forecast available at gate closure; the green line shows actual outturns from Elexon's FUELHH stream.
>
> We can filter across weekly windows or inspect the full month. If I click on any peak—for example, on January 4th—we see a detailed breakdown: the forecast called for 18,700 MW, but actual outturn was 15,228 MW, resulting in a positive signed error of +3,471 MW with a lead time of 14.5 hours.
>
> Below this is our **Error Analysis** panel. 
> The timeline visually highlights our error distribution: amber bars denote overforecasting (+MW), while blue bars denote underforecasting (−MW).
> If we toggle to the **Diurnal Profile**, we see how forecast uncertainty varies across the 24 hours of the day. In January, error volatility peaks during the afternoon peak demand hours (between 16:00 and 19:00 UTC), which is exactly when wholesale price spreads are widest."*

---

### [3:30 – 4:30] Forecast Revision Explorer & Decision Cutoff
> **Action**: Scroll to the Forecast Revision Explorer. Change the delivery date picker to 2026-01-15. Point out the 'Selected at Cutoff' badge vs 'Disqualified' badges.
>
> **Script**:
> *"Now let's examine the most critical methodology in this product: **The Day-Ahead Decision Cutoff**.
>
> In reality, National Grid ESO publishes new wind forecast runs every 3 to 4 hours. By delivery time, several revised forecasts have been published.
>
> But here in the **Forecast Revision Explorer**, look at January 15th:
> The system tracks every historical publication run. We define a strict trading cutoff: **Day D-1 at 11:00 UTC** (or 09:50 for the GB auction gate). 
> Notice that Version published at 09:30 UTC is marked with the blue star: **Selected at Cutoff**. 
> All subsequent versions published later that evening or intraday are marked in red as **Ineligible / Post-cutoff revisions**. 
> This guarantees that we never calculate historical accuracy using forecasts that weren't yet known when contracts were traded."*

---

### [4:30 – 5:00] Business Value & Procurement Scope
> **Action**: Scroll to the Data Quality Panel. Highlight the disclaimer and coverage metrics.
>
> **Script**:
> *"Finally, here in our **Data Quality Panel**, we see complete audit transparency: 100% forecast coverage, 100% actual outturn coverage, and zero gaps.
>
> To close the customer review, an important operational boundary: Wind forecast accuracy is vital for hedging renewable volume risk, but it does not dictate total procurement. Trading desks combine these wind intelligence metrics with consumer demand models, solar generation, and interconnector flows to formulate their ultimate day-ahead bidding strategy."*

---

## Part 2: Technical Lead Review (5:00 – 10:00)

### [5:00 – 6:00] Architecture Overview & Tech Stack
> **Action**: Open terminal or show the Mermaid architecture diagram from the README.
>
> **Script**:
> *"Welcome to Part 2: Technical Lead Review.
>
> Let's look at the engineering architecture. The system is built as a modular decoupled application:
> - **Backend**: Python 3.12 with FastAPI, Pydantic v2 schemas, NumPy, and Pandas for high-speed statistical vector calculations.
> - **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, and Recharts, with full responsive layouts and accessible dark/light theming.
> - **Infrastructure**: Containerized with multi-stage Dockerfiles and Docker Compose, with Nginx reverse proxying API traffic in production."*

---

### [6:00 – 7:30] Elexon Client & Cutoff Selection Engine
> **Action**: Show `backend/app/services/elexon_client.py` and `backend/app/services/forecast_service.py` in VS Code / IDE.
>
> **Script**:
> *"Let's look at how data is ingested from Elexon BMRS:
> In `elexon_client.py`, we query strictly two official streams: `FUELHH/stream` filtered to `fuelType=WIND`, and `WINDFOR/stream` for forecast publications. 
> To prevent upstream timeouts, our client uses parallel chunking with exponential backoff on transient HTTP 429 or 5xx errors.
>
> Now, look at `forecast_service.py`:
> This is where the Day-Ahead Decision methodology is implemented:
> 1. For delivery date $D$, we compute the cutoff timestamp $(D-1) \text{ at } \text{cutoff\_time}$ (e.g. 11:00 UTC).
> 2. We filter all candidate WINDFOR records to those with `publishTime <= cutoff_dt`.
> 3. We take the latest valid publication: `max(publishTime)`.
> 4. WINDFOR reports hourly generation rates (`HH:00:00Z`). We map each hourly rate across both corresponding half-hour settlement periods (SP $2k-1$ and $2k$), preserving standard GB settlement rules.
> 5. Actual outturns from FUELHH are joined on the normalized UTC timestamp, and duplicate records are resolved deterministically by publication timestamp."*

---

### [7:30 – 8:30] Metrics Engine & Mathematical Rigor
> **Action**: Show `backend/app/services/metrics_service.py`.
>
> **Script**:
> *"In `metrics_service.py`, we implement our statistical calculations:
> - Signed error is strictly $F - A$.
> - MAE and RMSE are computed using NumPy vector arrays.
> - For WAPE ($\sum |F - A| / \sum A$), we have a strict guard: if the sum of actuals is zero, WAPE returns `null` rather than dividing by zero or producing misleading percentages.
> - We also compute grouped aggregations by decision date, settlement period (1–48), and hour of day."*

---

### [8:30 – 9:15] Automated Test Suite Execution
> **Action**: Switch to terminal. Run `pytest tests -v` in `backend`, then run `npm run test` in `frontend`.
>
> **Script**:
> *"Let's run our automated tests live.
> First, in the backend: `pytest tests -v`.
> All 17 tests pass in under 2 seconds! This verifies:
> - Selection of latest forecast prior to cutoff.
> - Strict exclusion of post-cutoff forecasts.
> - Deterministic duplicate resolution.
> - Hand-calculated synthetic fixtures for MAE, RMSE, Bias, and WAPE.
> - Timezone UTC normalization and invalid parameter 422 validations.
>
> Next, in the frontend: `npm run test`.
> All 9 Vitest and React Testing Library tests pass, confirming metric formatting, KPI rendering, and error retry handlers."*

---

### [9:15 – 10:00] Caching, Deployment & Wrap-Up
> **Action**: Show `docker-compose.yml`, `backend/app/core/cache.py`, and `render.yaml`.
>
> **Script**:
> *"For production performance, `cache.py` provides a thread-safe in-memory cache with an explicit 1-hour TTL, so repeated client requests return in under 20 milliseconds.
>
> In `docker-compose.yml`, we orchestrate both services with health checks and private bridge networking.
> For cloud deployment:
> - The frontend is configured for **Vercel** with SPA rewrites in `vercel.json`.
> - The backend is configured for **Render** via `render.yaml` with automated health probes at `/api/health`.
>
> In conclusion, Wind Intelligence delivers a verified, highly accurate, and mathematically sound platform ready for day-ahead energy trading analysis. Thank you!"*
