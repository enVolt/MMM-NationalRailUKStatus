Module.register("MMM-TrainStatus", {
	defaults: {
		updateInterval: 60 * 1000,
		retryDelay: 5000,
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
	},

	start () {
		Log.info(`Starting module: ${this.name}`);
		this.trainData = [];
		this.loaded = false;
		this.currentPeriod = null;
		this.lastUpdate = null;
		this.isHidden = false;

		// Initial check
		this.checkPeriod();

		// Periodic check
		setInterval(() => {
			this.checkPeriod();
		}, 60 * 1000);
	},

	checkPeriod () {
		const now = new Date();
		const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

		const activePeriod = this.config.periods.find((p) => currentTime >= p.start && currentTime <= p.end);

		if (activePeriod) {
			// If period changed or first time
			if (!this.currentPeriod || this.currentPeriod.title !== activePeriod.title) {
				this.currentPeriod = activePeriod;
				this.loaded = false; // Reset loading state for new period
				this.sendSocketNotification("UPDATE_CONFIG", {
					origin: activePeriod.origin,
					destination: activePeriod.destination,
					updateInterval: this.config.updateInterval
				});
				this.updateDom(); // Refresh header/content
			}
			
			if (this.isHidden) {
				this.show(1000);
				this.isHidden = false;
			}
		} else {
			if (this.currentPeriod || !this.isHidden) {
				this.currentPeriod = null;
				this.trainData = [];
				this.loaded = false;
				this.hide(1000);
				this.isHidden = true;
				this.updateDom(); // Ensure header is cleared
			}
		}
	},

	getHeader () {
		return this.currentPeriod ? this.currentPeriod.title : "";
	},

	getStyles () {
		return ["MMM-TrainStatus.css"];
	},

	getDom () {
		const wrapper = document.createElement("div");

		// If no period is active, return an empty div
		if (!this.currentPeriod) {
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = "Loading trains...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (this.trainData.length === 0) {
			wrapper.innerHTML = "No train data available";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		const table = document.createElement("table");
		table.className = "small";

		this.trainData.slice(0, 4).forEach((train) => {
			const row = document.createElement("tr");
			table.appendChild(row);

			const timeCell = document.createElement("td");
			timeCell.innerHTML = train.std;
			timeCell.className = "bright";
			row.appendChild(timeCell);

			const statusCell = document.createElement("td");
			statusCell.innerHTML = train.displayStatus;
			if (train.isCancelled) {
				statusCell.className = "status-cancelled";
			} else if (train.etd === "On time") {
				statusCell.className = "status-on-time";
			} else {
				statusCell.className = "status-delayed";
			}
			row.appendChild(statusCell);
		});

		wrapper.appendChild(table);

		if (this.lastUpdate) {
			const updateTime = document.createElement("div");
			updateTime.innerHTML = `Last update: ${this.lastUpdate}`;
			updateTime.className = "dimmed xsmall";
			updateTime.style.marginTop = "5px";
			wrapper.appendChild(updateTime);
		}

		return wrapper;
	},

	socketNotificationReceived (notification, payload) {
		if (notification === "TRAIN_DATA") {
			// Only process if we are currently in an active period
			if (this.currentPeriod) {
				this.trainData = payload;
				this.loaded = true;
				this.lastUpdate = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
				this.updateDom();
			}
		}
	}
});
