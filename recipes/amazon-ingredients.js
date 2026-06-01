// Amazon ingredient ASIN mapping for keto pantry staples
// Tag: carnivoreweek-20 (Amazon.ca Associates)
// Only shelf-stable items — nobody buys chicken thighs on Amazon
var AMAZON_TAG = 'carnivoreweek-20';
var INGREDIENT_ASINS = {
  // Oils & Fats
  'olive oil': {asin: 'B07YFY5TF9', name: 'Pompeian Extra Virgin Olive Oil'},

  'sesame oil': {asin: 'B00MWIS53C', name: 'La Tourangelle Toasted Sesame Oil'},
  'ghee': {asin: 'B00PGPBDYG', name: 'Fourth & Heart Ghee Butter'},
  'coconut oil': {asin: 'B003B3OOPA', name: 'Viva Naturals Organic Coconut Oil'},
  
  // Baking & Flour
  'almond flour': {asin: 'B00CLTBFJ0', name: 'Blue Diamond Almond Flour'},
  'baking powder': {asin: 'B000BRDFP4', name: 'Rumford Baking Powder'},
  'erythritol': {asin: 'B016S63L6S', name: 'Anthony\'s Erythritol Sweetener'},
  'stevia': {asin: 'B008YAM7BW', name: 'SweetLeaf Stevia Packets'},
  'swerve': {asin: 'B0131GF80K', name: 'Swerve Powdered Sweetener'},
  'pork rinds': {asin: 'B07Y5T1JKZ', name: 'Epic Pork Rinds'},
  'vanilla extract': {asin: 'B0019GZ9RC', name: 'Simply Organic Vanilla Extract'},
  'cocoa powder': {asin: 'B001E5E2M2', name: 'Ghirardelli Unsweetened Cocoa'},
  'almond milk': {asin: 'B084FLPFNJ', name: 'Silk Unsweetened Almond Milk'},
  
  // Canned & Jarred
  'beef broth': {asin: 'B00MWIQKUA', name: 'Pacific Foods Beef Broth'},
  'chicken broth': {asin: 'B01F4BWMZA', name: 'Pacific Foods Chicken Broth'},
  'chicken stock': {asin: 'B01F4BWMZA', name: 'Pacific Foods Chicken Broth'},
  'vegetable broth': {asin: 'B00MWIQHSA', name: 'Pacific Foods Vegetable Broth'},
  'diced tomatoes': {asin: 'B074H5JQF5', name: 'Muir Glen Diced Tomatoes'},
  'tomato paste': {asin: 'B0BXYJ8PVS', name: 'Muir Glen Tomato Paste'},
  'marinara sauce': {asin: 'B000FKDJ1O', name: 'Rao\'s Marinara (low sugar)'},
  'artichoke hearts': {asin: 'B007T1BHBI', name: 'Reese Quartered Artichoke Hearts'},
  'soy sauce': {asin: 'B01DM8BOK4', name: 'San-J Tamari Soy Sauce'},
  'apple cider vinegar': {asin: 'B0013GBG56', name: 'Bragg Apple Cider Vinegar'},
  'sriracha': {asin: 'B001EO5Q64', name: 'Huy Fong Sriracha'},
  'ranch dressing mix': {asin: 'B00016LME0', name: 'Hidden Valley Ranch Seasoning'},
  'tomato sauce': {asin: 'B000FKDJ1O', name: 'Rao\'s Marinara'},
  
  // Spices & Seasonings
  'cumin': {asin: 'B0019IBKHA', name: 'Simply Organic Ground Cumin'},
  'chili powder': {asin: 'B07DVRDKZN', name: 'Simply Organic Chili Powder'},
  'paprika': {asin: 'B0019I2FIO', name: 'Simply Organic Smoked Paprika'},
  'italian seasoning': {asin: 'B07H2Z3JL3', name: 'Simply Organic Italian Seasoning'},
  'cinnamon': {asin: 'B000WR4LM8', name: 'Simply Organic Cinnamon'},
  'garlic powder': {asin: 'B0019GK5R2', name: 'Simply Organic Garlic Powder'},
  'onion powder': {asin: 'B07H2MXG6W', name: 'Simply Organic Onion Powder'},
  'dried oregano': {asin: 'B0019GJR72', name: 'Simply Organic Oregano'},
  'dried thyme': {asin: 'B0019I2FJ8', name: 'Simply Organic Thyme'},
  'nutmeg': {asin: 'B0019GKKS0', name: 'Simply Organic Nutmeg'},
  'worcestershire sauce': {asin: 'B005DPNGFG', name: 'Lea & Perrins Worcestershire'},
  'dried parsley': {asin: 'B0019GJRHI', name: 'Simply Organic Parsley'},
  'dry mustard': {asin: 'B0019GK5QY', name: 'Simply Organic Dry Mustard'},
  'black pepper': {asin: 'B0019GKGMU', name: 'Simply Organic Black Pepper'},
  'salt': {asin: 'B007B866HI', name: 'Redmond Real Salt Fine'},
  'kosher salt': {asin: 'B007B866HI', name: 'Redmond Real Salt Fine'},
  
  // Nuts & Seeds
  'walnuts': {asin: 'B00E1XEX30', name: 'Fisher Walnut Halves'},
  'pecans': {asin: 'B00E1XDLIA', name: 'Fisher Pecan Halves'},
  'almonds': {asin: 'B01DXQYH1I', name: 'Blue Diamond Whole Almonds'},
  'shredded coconut': {asin: 'B000EDG3UQ', name: 'Bob\'s Red Mill Shredded Coconut'},
  
  // Dairy & Cheese
  'heavy cream': {asin: 'B076TQM7JD', name: 'Organic Valley Heavy Whipping Cream'},
  'heavy whipping cream': {asin: 'B076TQM7JD', name: 'Organic Valley Heavy Whipping Cream'},
  'parmesan cheese': {asin: 'B000EONBEA', name: 'BelGioioso Parmesan Wedge'},
  'cream cheese': {asin: 'B00YR6LSBU', name: 'Philadelphia Original Cream Cheese'},
  'sour cream': {asin: 'B07BQPTMSV', name: 'Daisy Pure & Natural Sour Cream'},
  'shredded mozzarella': {asin: 'B08FH5GFBG', name: 'Galbani Shredded Mozzarella'},
  'shredded cheddar': {asin: 'B07QX6CVH3', name: 'Tillamook Sharp Cheddar Shredded'},
  'colby-jack': {asin: 'B08CWJ8V3W', name: 'Tillamook Colby Jack Shredded'},
  'cottage cheese': {asin: 'B0CYG79HTP', name: 'Good Culture Cottage Cheese'},
};

function getAmazonDomain() {
  var domain = 'www.amazon.ca';
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.indexOf('America/') === 0) {
      var caZones = ['Toronto','Vancouver','Edmonton','Winnipeg','Halifax','St_Johns','Montreal','Regina'];
      var isCa = caZones.some(function(z) { return tz.indexOf(z) !== -1; });
      domain = isCa ? 'www.amazon.ca' : 'www.amazon.com';
    } else if (tz.indexOf('Europe/London') !== -1) { domain = 'www.amazon.co.uk'; }
    else if (tz.indexOf('Europe/') === 0) { domain = 'www.amazon.de'; }
    else if (tz.indexOf('Australia/') === 0) { domain = 'www.amazon.com.au'; }
  } catch(e) {}
  return domain;
}

function buildProductUrl(asin) {
  return 'https://' + getAmazonDomain() + '/dp/' + asin + '?tag=' + AMAZON_TAG;
}

function buildCartUrl(asins) {
  // Old cart/add API is deprecated. Link to first product as fallback.
  return buildProductUrl(asins[0]);
}

function matchIngredients(ingredientTexts) {
  var matched = [];
  ingredientTexts.forEach(function(text) {
    var lower = text.toLowerCase();
    Object.keys(INGREDIENT_ASINS).forEach(function(key) {
      if (lower.indexOf(key) !== -1 && !matched.find(function(m) { return m.asin === INGREDIENT_ASINS[key].asin; })) {
        matched.push(INGREDIENT_ASINS[key]);
      }
    });
  });
  return matched;
}
