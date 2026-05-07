const NodeHelper = require("node_helper");
const Log = require("logger");

module.exports = NodeHelper.create({
	start () {
		Log.log(`Starting node helper for: ${this.name}`);
		this.fetchInterval = null;
	},

	async fetchData () {
		if (!this.config) return;

		const url = `http://localhost:8000/api/schedule?origin=${this.config.origin}&destination=${this.config.destination}`;
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const payload = await response.json();
			
			const trainServices = payload.trainServices || [];
			const processedData = trainServices.map(service => {
				const std = service.std;
				const etd = service.etd;
				const isCancelled = service.isCancelled === true;

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
