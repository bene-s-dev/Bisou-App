const adjustedDate = new Date();
const dayFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = dayFormatter.formatToParts(adjustedDate);
  console.log('Parts:', JSON.stringify(parts));
  const [{ value: day }, , { value: month }, , { value: year }] = parts;
  console.log('Result:', `${year}-${month}-${day}`);

