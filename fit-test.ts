const req = {
  "aggregateBy": [
    {
      "dataTypeName": "com.google.step_count.delta"
    },
    {
      "dataTypeName": "com.google.calories.expended"
    },
    {
      "dataTypeName": "com.google.distance.delta"
    },
    {
      "dataTypeName": "com.google.active_minutes"
    }
  ],
  "endTimeMillis": Date.now(),
  "startTimeMillis": Date.now() - 30 * 24 * 60 * 60 * 1000,
  "bucketBySession": {
    "minDurationMillis": 60000
  }
};
console.log(JSON.stringify(req, null, 2));
