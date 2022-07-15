const breezartObject = {
    link: 'http://www.breezart.ru/',
    async scrape(browser){
        let page = await browser.newPage();
        await page.goto(this.link)

    }
}

module.exports = {
    breezartObject
}