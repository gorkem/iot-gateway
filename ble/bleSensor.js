/*eslint-env node */
	
function BleSensor(characteristic){
	this._characteristic = characteristic;
}

BleSensor.prototype.poll= function (delay, callback){
	if(this._stopPolling){
		return;
	}
	this.readData(callback);
	var that = this;
	setTimeout(function(){
		that.poll(delay, callback);
		}, delay);
};

BleSensor.prototype.cancel = function(){
	this._stopPolling = true;
};

BleSensor.prototype.readData = function (callback){
	this._characteristic.read(function(error, data){
		if(error){
			console.log();
		}
		else{
			callback(data);
		}
	});
};

exports.BleSensor = BleSensor;