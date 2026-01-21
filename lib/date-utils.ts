export const getDominicanDate = (): string => {
    // Create a date object from current time
    const now = new Date();
    
    // Format it to Dominican time to get the correct components
    // 'en-CA' gives YYYY-MM-DD format which is close to ISO
    const options: Intl.DateTimeFormatOptions = {
        timeZone: "America/Santo_Domingo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    };

    // We can't just use toISOString() because that's always UTC.
    // We need to construct an ISO-like string that REPRESENTS the local time in RD.
    // However, usually ISO strings implies UTC (Z) or specific offset.
    // The requirement is "force timezone America/Santo_Domingo".
    
    // Let's get the parts
    const formatter = new Intl.DateTimeFormat('en-CA', options); // YYYY-MM-DD
    const parts = formatter.formatToParts(now);
    
    // Using sv-SE (Sweden) locale usually gives ISO format YYYY-MM-DD hh:mm:ss
    const optionsISO: Intl.DateTimeFormatOptions = {
        timeZone: "America/Santo_Domingo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    };
    
    const dateString = new Intl.DateTimeFormat('sv-SE', optionsISO).format(now);
    // dateString is "YYYY-MM-DD hh:mm:ss"
    // Replace space with T and add timezone offset -04:00
    return dateString.replace(' ', 'T') + "-04:00";
};

export const formatDominicanDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-DO", {
        timeZone: "America/Santo_Domingo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).format(date);
};
