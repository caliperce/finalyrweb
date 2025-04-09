/**
 * Calculates parking duration and fee
 * @param {Date} entryTime - Entry timestamp
 * @param {Date} exitTime - Exit timestamp
 * @returns {Object} - Object containing duration and fee information
 */
function calculateParkingFee(entryTime, exitTime) {
    const durationMs = exitTime - entryTime;
    
    // Format duration as HH:MM:SS
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Calculate fee (example: $2 per hour, minimum 1 hour)
    const hourlyRate = 2;
    const billableHours = Math.max(1, Math.ceil(durationMs / 3600000));
    const fee = billableHours * hourlyRate;
    
    return {
        duration,
        durationMs,
        fee,
        billableHours,
        hourlyRate
    };
}

module.exports = {
    calculateParkingFee
}; 