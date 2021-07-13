var CronJob = require('cron').CronJob;

import eventParser from './eventParser';

const job = new CronJob('* * * * *', function() {
	const d = new Date();
	console.log(d);
	eventParser();
});

job.start();