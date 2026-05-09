# MMM-NationalRailUKStatus

A MagicMirror² module to display train schedules directly from the National Rail LDBWS API with dynamic direction switching based on commute periods.

![Preview](preview.png)

## Features
- **Direct API Integration:** Calls National Rail Open Data portal directly (no proxy needed).
- Displays Scheduled and Expected departure/arrival times.
- Color-coded status (On time, Delayed, Cancelled).
- Dynamic Direction Switching: Automatically switches origin/destination and titles based on the time of day.
- Auto-hiding: Module hides itself outside of configured commute windows.
- "Last Update" timestamp display.

## Installation
Clone this repo into your `modules` directory:
```bash
cd ~/MagicMirror/modules
git clone https://github.com/enVolt/MMM-NationalRailUKStatus.git
```

## Configuration
Add the module to your `config/config.js` file:
```javascript
{
    module: "MMM-TrainStatus",
    position: "top_left",
    config: {
        apiKey: "YOUR_NATIONAL_RAIL_API_KEY",
        updateInterval: 60 * 1000,
        periods: [
            {
                start: "07:00",
                end: "11:00",
                origin: "HEN",
                destination: "STP",
                title: "Hendon to KX"
            },
            {
                start: "15:00",
                end: "19:00",
                origin: "STP",
                destination: "HEN",
                title: "KX to Hendon"
            }
        ]
    }
}
```
