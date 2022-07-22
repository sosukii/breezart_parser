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
        async function returnItemData(itemPage, categoryIndex, itemPageIndex, arrayDescription){
            const photos = await itemPage.$$eval('div.frame.prod.content img', imgs=> {
                const links = imgs.map(img => img.getAttribute('src'))
                return (links.map(link => link.includes('http') ? `${link}; ` : `http://www.breezart.ru${link}; `)).join('')
            })
            const name = await itemPage.$eval('h1', e=>e.textContent)
            const price = await itemPage.$eval('span.price', e=>(e.textContent).slice(0,e.textContent.length - 2))
            const enabled = '+'
            const amount = price ? 1 : 0
            const currency = 'RUB'
            const producer = 'Breezart'

            const properties = await itemPage.evaluate(async () => {
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
            const description = await returnDescription(itemPage)
            const category = arrayOfCategories[categoryIndex]
            const sku = `${today.getDate()}${today.getMonth()}${today.getFullYear().toString().slice(2)}${today.getMilliseconds()}`
            
            const briefdescription = arrayDescription[itemPageIndex]   

            return {photos, name, price, enabled, amount, currency, producer, properties, description, category, sku, briefdescription}
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
                    : parent.textContent.replace(/\t/g, '')
                
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
        async function returnArrayOfShortDescription(page){
                const arrayOfBriefDescriptionForItemsPerPage = await page.$$eval('div.frame.prod.content > div.prod-right', allProdRight => {
                    let result = []
    
                    allProdRight.forEach(oneProdRight => {
                        const children = oneProdRight.children
                        let childWithoutPrice = []
    
                        for(let child of children) {
                            if(!child.classList.contains('price-big')){
                                child.classList.contains('type')
                                    ? childWithoutPrice.push(`Тип: ${child.innerHTML.replace(/\t|\n/g, '')}; `)
                                    : childWithoutPrice.push(child.innerHTML.replace(/\t|\n/g, ''))
                            }
                        }
                       
                       result.push(childWithoutPrice.join('<br>'))
                    })
                    
                    return result
                })
                return arrayOfBriefDescriptionForItemsPerPage
        }
        function isTargetSibling(headerElement){
            return headerElement.nextElementSibling.classList.contains('prod-right')
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

        const browser = await puppeteer.launch({headless: false}); //{headless: false} для отображения окна
        const mainPage = await browser.newPage();
        await mainPage.goto(this.link);

        mainPage.waitForNavigation()
        const linksOnCategory = await returnCategoryLinksArray(mainPage)
        
        for(let i = 0; i < linksOnCategory.length; i++){
            await mainPage.goto(linksOnCategory[i])

            const arrayDescription_currentPage = await returnArrayOfShortDescription(mainPage)
            const linksOnItems = await returnLinksToItemsPerPage(mainPage)

            for(let j = 0; j < linksOnItems.length; j++){
                const pageItem =await browser.newPage()
                await pageItem.goto(linksOnItems[j])
     
                const itemData = await returnItemData(pageItem, i, j, arrayDescription_currentPage)
                console.log('Один товар:');
                console.log(itemData);

                await pageItem.close()
            }
        }


    }
}

breezartObject.scrape()


module.exports = {
    breezartObject
}