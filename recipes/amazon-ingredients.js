// Amazon ingredient ASIN mapping for keto pantry staples
// Tag: carnivoreweek-20 (Amazon.ca Associates)
// Only shelf-stable items — nobody buys chicken thighs on Amazon
var AMAZON_TAG = 'carnivoreweek-20';
var INGREDIENT_ASINS = {
  // Oils & Fats
  'olive oil': {asin: 'B07YFY5TF9', name: 'Pompeian Extra Virgin Olive Oil'},
  'avocado oil': {asin: 'B00MWIS13M', name: 'Chosen Foods Avocado Oil'},
  'sesame oil': {asin: 'B00MWIS53C', name: 'La Tourangelle Toasted Sesame Oil'},
  'ghee': {asin: 'B00PGPBDYG', name: 'Fourth & Heart Ghee Butter'},
  'coconut oil': {asin: 'B003B3OOPA', name: 'Viva Naturals Organic Coconut Oil'},
  
  // Baking & Flour
  'almond flour': {asin: 'B00CLTBFJ0', name: 'Blue Diamond Almond Flour'},
  'baking powder': {asin: 'B000BRDFP4', name: 'Rumford Baking Powder'},
  'erythritol': {asin: 'B016S63L6S', name: 'Anthony\'s Erythritol Sweetener'},
  'stevia': {asin: 'B008YAM7BW', name: 'SweetLeaf Stevia Packets'},
  'pork rinds': {asin: 'B07Y5T1JKZ', name: 'Epic Pork Rinds'},
  
  // Canned & Jarred
  'beef broth': {asin: 'B00MWIQKUA', name: 'Pacific Foods Beef Broth'},
  'chicken broth': {asin: 'B01F4BWMZA', name: 'Pacific Foods Chicken Broth'},
  'diced tomatoes': {asin: 'B074H5JQF5', name: 'Muir Glen Diced Tomatoes'},
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
  
  // Nuts & Seeds
  'walnuts': {asin: 'B00E1XEX30', name: 'Fisher Walnut Halves'},
  'pecans': {asin: 'B00E1XDLIA', name: 'Fisher Pecan Halves'},
  'almonds': {asin: 'B01DXQYH1I', name: 'Blue Diamond Whole Almonds'},
  'shredded coconut': {asin: 'B000EDG3UQ', name: 'Bob\'s Red Mill Shredded Coconut'},
  
  // Dairy (shelf-stable)
  'heavy cream': {asin: 'B076TQM7JD', name: 'Organic Valley Heavy Whipping Cream'},
  'parmesan cheese': {asin: 'B000EONBEA', name: 'BelGioioso Parmesan Wedge'},
};

function buildCartUrl(asins) {
  // Detect user's likely Amazon domain from timezone/language
  var domain = 'www.amazon.ca'; // default to .ca for our audience
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    var lang = (navigator.language || '').toLowerCase();
    if (tz.indexOf('America/') === 0) {
      // US timezones: Eastern, Central, Mountain, Pacific, etc (not Toronto/Vancouver/etc)
      var caZones = ['Toronto','Vancouver','Edmonton','Winnipeg','Halifax','St_Johns','Montreal','Regina'];
      var isCa = caZones.some(function(z) { return tz.indexOf(z) !== -1; });
      domain = isCa ? 'www.amazon.ca' : 'www.amazon.com';
    } else if (tz.indexOf('Europe/London') !== -1) { domain = 'www.amazon.co.uk'; }
    else if (tz.indexOf('Europe/') === 0) { domain = 'www.amazon.de'; }
    else if (tz.indexOf('Australia/') === 0) { domain = 'www.amazon.com.au'; }
  } catch(e) {}
  var url = 'https://' + domain + '/gp/aws/cart/add.html?AssociateTag=' + AMAZON_TAG;
  asins.forEach(function(asin, i) {
    url += '&ASIN.' + (i+1) + '=' + asin + '&Quantity.' + (i+1) + '=1';
  });
  return url;
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
