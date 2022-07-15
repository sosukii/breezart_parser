async function scrape(browserInstance, dealerObject){
    try{
        const data = await dealerObject.scrape(browserInstance)
    }
    catch(error){
        console.log('file: controller.js function: scrape. Error: ', error);
    }

}

module.exports = browserInstance => scrape(browserInstance)