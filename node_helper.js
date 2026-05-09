/**
 * The local API wrapper powering this module uses the REST-based endpoint 
 * provided by National Rail's Open Data portal. The payload structure 
 * matches the following:
 * 
 * Endpoint: GetDepBoardWithDetails
 * Base URL: https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120/
 * Method: GET (JSON-based)
 */

const NodeHelper = require("node_helper");
const Log = require("logger");

module.exports = NodeHelper.create({
	start () {
		Log.log(`Starting node helper for: ${this.name}`);
		this.fetchInterval = null;
	},

	async fetchData () {
		if (!this.config || !this.config.apiKey) {
			Log.error(`${this.name}: National Rail API key is missing from configuration.`);
			return;
		}

		const origin = this.config.origin;
		const destination = this.config.destination;
		
		const url = new URL(`https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120/GetDepBoardWithDetails/${origin}`);
		url.searchParams.append("filterCrs", destination);
		url.searchParams.append("filterType", "to");
		url.searchParams.append("numRows", "10");
		url.searchParams.append("timeWindow", "120");

		try {
			const response = await fetch(url.toString(), {
				headers: {
					"x-apikey": this.config.apiKey,
					"user-agent": "MagicMirror/MMM-NationalRailUKStatus"
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const payload = await response.json();
			
			const trainServices = payload.trainServices || [];
			const processedData = trainServices.map(service => {
				const std = service.std;
				const etd = service.etd;
				const isCancelled = service.isCancelled === true;

				// Extract arrival time for the destination
				let sta = null;
				let eta = null;
				
				if (service.subsequentCallingPoints && service.subsequentCallingPoints.length > 0) {
					const points = service.subsequentCallingPoints[0].callingPoint || [];
					const destPoint = points.find(p => p.crs === destination);
					if (destPoint) {
						sta = destPoint.st;
						eta = destPoint.et;
					}
				}

				let displayStatus = "";
				if (isCancelled) {
					displayStatus = "CANCELLED";
				} else if (etd === "On time") {
					displayStatus = "On time";
				} else {
					displayStatus = `exp. ${etd}`;
				}

				return {
					std,
					etd,
					sta,
					eta,
					isCancelled,
					displayStatus
				};
			});

			this.sendSocketNotification("TRAIN_DATA", processedData);
		} catch (error) {
			Log.error(`${this.name}: Error fetching train data:`, error);
		}
	},

	socketNotificationReceived (notification, payload) {
		if (notification === "UPDATE_CONFIG") {
			this.config = payload;
			
			// Clear existing interval if any
			if (this.fetchInterval) {
				clearInterval(this.fetchInterval);
			}

			this.fetchData();
			this.fetchInterval = setInterval(() => {
				this.fetchData();
			}, this.config.updateInterval);
		}
	}
});
