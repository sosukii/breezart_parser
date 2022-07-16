const puppeteer = require('puppeteer')

const breezartObject = {
    link: 'http://www.breezart.ru/',
    async scrape(){
        console.log('scrape working!');

        const browser = await puppeteer.launch({headless: false}); //{headless: false} для отображения окна
        const mainPage = await browser.newPage();
        await mainPage.goto(this.link);

        mainPage.waitForNavigation()

        async function returnCategoryLinksArray(mainPage){
            const links = await mainPage.$$eval('div.mMain > ul > li.L1 > a', links =>
                links.map(link => `http://www.breezart.ru${link.getAttribute('href')}`)
            );
            return links.filter(link => !link.includes('accessories')); //return all links except link on  accessories
        }
        async function returnLinksToItemsPerPage(categoryPage){
            const links = await categoryPage.$$eval('div.frame.prod.content > h2 > a', links =>
                links.map(link => `http://www.breezart.ru${link.getAttribute('href')}`)
            )
            return links
        }
        async function getItemData(page){
            const name = await page.$eval('h1', e => e.textContent)
            console.log(name);
        }
        
        const linksOnCategory = await returnCategoryLinksArray(mainPage)
        
        for(let i = 0; i < linksOnCategory.length; i++){
            await mainPage.goto(linksOnCategory[i])
            const linksOnItems = await returnLinksToItemsPerPage(mainPage)
            
            for(let j = 0; j < linksOnItems.length; j++){
                const pageItem =await browser.newPage()
                await pageItem.goto(linksOnItems[j])

                const name = await pageItem.$eval('h1', e=>e.textContent)
                console.log('название товара: ', name);
                await pageItem.close()
            }
        }


    }
}

breezartObject.scrape()


module.exports = {
    breezartObject
}