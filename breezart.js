const puppeteer = require('puppeteer')

const breezartObject = {
    link: 'http://www.breezart.ru/',
    async scrape(){
        console.log('scrape working!');

        const browser = await puppeteer.launch(); //{headless: false} для отображения окна
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

                // const photos = await pageItem.$$eval('div.frame.prod.content img', imgs=> {
                //     const links = imgs.map(img => img.getAttribute('src'))
                //     return links.map(link => link.includes('http') ? link : `http://www.breezart.ru${link}`)
                // })
                // const name = await pageItem.$eval('h1', e=>e.textContent)
                // const price = await pageItem.$eval('span.price', e=>(e.textContent).slice(0,e.textContent.length - 2))
                // const enabled = '+'
                // const amount = price ? 1 : 0
                // const currency = 'RUB'
                // const producer = 'Breezart'

                // const properties = await pageItem.evaluate(async () => {
                //     const propsArray = []

                //     const table = document.querySelector('table.prod-param tbody')
                //     const rows = table.querySelectorAll('tr')
                //     rows.forEach(row => {
                //         const  titleWithPrice = row.querySelector('th').textContent.includes('цена')
                        
                //         if(!titleWithPrice){
                //             const title = row.querySelector('th').textContent
                //             const value = row.querySelector('td').textContent

                //             const oneProp = `${title} ${value}; `
                //             propsArray.push(oneProp)
                //         }
                //     })
                //     return propsArray.join('')
                // })


                function returnDescription() {
                    const element = ['h2', 'h3', 'ul']
                    const text = ['Описание', 'Функции автоматики']
                    
                }

                function getDescriptionData(page, element, text){
                    await page.$$eval(element, headers => {
                        let parent 
                        headers.map(header => {
                            if(header.textContent === text){
                                parent = header.parentNode
                            }
                        })
                        const result = text ==='Описание' ? parent.textContent : parent.querySelector('ul').innerHTML
                        return text ==='Описание' ? `<ul>${result}</ul>` : result || ''
                    })
                }
                
                const description_part1 = await pageItem.$$eval('h2', headers => {
                    let parent 
                    headers.map(header => {
                        if(header.textContent === 'Описание'){
                            parent = header.parentNode
                        }
                    })
                    const result = parent.textContent
                    return result || ''
                })
                const description_part2 = await pageItem.$$eval('h2', headers => {
                    let parent
                    headers.map(header => {
                        if(header.textContent === 'Функции автоматики'){
                            parent = header.parentNode
                        }
                    })
                    const result = parent.querySelector('ul').innerHTML
                    return `<ul>${result}</ul>` || ''
                })

                const alternativeDescription = await pageItem.$$eval('h3', headers => {
                    let parent 
                    headers.map(header => {
                        if(header.textContent === 'Описание'){
                            parent = header.parentNode
                        }
                    })
                    const result = parent.textContent
                    return result || ''
                })

                console.log( description_part2);
                // const description = await pageItem.$eval('span.description', e)

                
                // console.log('название товара: ', name, price);
                await pageItem.close()
            }
        }


    }
}

breezartObject.scrape()


module.exports = {
    breezartObject
}