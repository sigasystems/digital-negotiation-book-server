export const parseVercelQuery = (req) => {
  const result = {};
  
  console.log("Parsing query for keys:", Object.keys(req.query));
  
  // Check for all possible query parameter formats
  Object.keys(req.query).forEach(key => {
    // Handle query[field]=value format
    const match = key.match(/^query\[([^\]]+)\]$/);
    if (match) {
      result[match[1]] = req.query[key];
      console.log(`Found ${match[1]} = ${req.query[key]} in query[${match[1]}]`);
    }
    // Handle direct field=value format
    else if (['status', 'country', 'isVerified', 'page', 'limit'].includes(key)) {
      result[key] = req.query[key];
      console.log(`Found ${key} = ${req.query[key]} in direct parameter`);
    }
  });
  
  // Also check req.query.query object (works locally)
  if (req.query.query && typeof req.query.query === 'object') {
    Object.assign(result, req.query.query);
    console.log("Merged from req.query.query:", req.query.query);
  }
  
  return result;
};