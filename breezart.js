const puppeteer = require('puppeteer')

const breezartObject = {
    link: 'http://www.breezart.ru/',
    async scrape(){
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
        async function getDescriptionData(page, element, text){
            const data = await page.evaluate(async (page, element, text) => {
                const headers = document.querySelectorAll(element)

                if(!headers || !headers.length) return

                let parent 
                headers.forEach(header => {
                    if(header.textContent === text){
                        parent = header.parentNode
                    }
                })

                let result = text ==='Функции автоматики' 
                    ? parent.querySelector('ul').innerHTML
                    : parent.textContent
                
                return text ==='Функции автоматики' ? `<ul>${result}</ul>` : result || ''
            }, page, element, text)
            return data
        }
        async function returnDescription(page) {
            const elements = ['h2', 'h3']
            const text = ['Описание', 'Функции автоматики']

            const part1 = await getDescriptionData(page, elements[0],text[0]) || ''
            const part2 = await getDescriptionData(page, elements[0], text[1]) || ''
            const alternativeDescription = await getDescriptionData(page, elements[1], text[0]) || ''

            return `${part1} \n  ${part2} \n ${alternativeDescription}`
        }
        const arrayOfCategories = [
            '[Кондиционеры >> Вентиляция >> Вентиляционные установки >> Приточные установки >> Breezart]',
            '[Кондиционеры >> Вентиляция >> Вентиляционные установки >> Приточно-вытяжные установки >> Breezart]',
            '[Кондиционеры >> Вентиляция >> Вентиляционные установки >> Установки для бассейна >> Breezart]',
            '[Кондиционеры >> Вентиляция >> Вентиляционное оборудование >> Увлажнители >> Breezart]',
            '[Кондиционеры >> Запчасти и аксессуары >> Фильтры]'
        ]
        const today = new Date()
        console.log('scrape working!');

        const browser = await puppeteer.launch(); //{headless: false} для отображения окна
        const mainPage = await browser.newPage();
        await mainPage.goto(this.link);

        mainPage.waitForNavigation()

        
        const linksOnCategory = await returnCategoryLinksArray(mainPage)
        
        for(let i = 0; i < linksOnCategory.length; i++){
            await mainPage.goto(linksOnCategory[i])
            const linksOnItems = await returnLinksToItemsPerPage(mainPage)

            for(let j = 0; j < linksOnItems.length; j++){
                console.log('категория номер ', i, ' называется категория ', linksOnCategory[i])
                const pageItem =await browser.newPage()
                await pageItem.goto(linksOnItems[j])

                const photos = await pageItem.$$eval('div.frame.prod.content img', imgs=> {
                    const links = imgs.map(img => img.getAttribute('src'))
                    return links.map(link => link.includes('http') ? link : `http://www.breezart.ru${link}`)
                })
                const name = await pageItem.$eval('h1', e=>e.textContent)
                const price = await pageItem.$eval('span.price', e=>(e.textContent).slice(0,e.textContent.length - 2))
                const enabled = '+'
                const amount = price ? 1 : 0
                const currency = 'RUB'
                const producer = 'Breezart'

                const properties = await pageItem.evaluate(async () => {
                    const propsArray = []

                    const table = document.querySelector('table.prod-param tbody')
                    const rows = table.querySelectorAll('tr')
                    rows.forEach(row => {
                        const  titleWithPrice = row.querySelector('th').textContent.includes('цена')
                        
                        if(!titleWithPrice){
                            const title = row.querySelector('th').textContent
                            const value = row.querySelector('td').textContent

                            const oneProp = `${title} ${value}; `
                            propsArray.push(oneProp)
                        }
                    })
                    return propsArray.join('')
                })
                const description = await returnDescription(pageItem)
                const category = arrayOfCategories[i]
                const sku = `${today.getDate()}${today.getMonth()}${today.getFullYear().toString().slice(2)}${today.getMilliseconds()}`




                await pageItem.close()
            }
        }


    }
}

breezartObject.scrape()


module.exports = {
    breezartObject
}