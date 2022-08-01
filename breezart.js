const puppeteer = require('puppeteer')
const fs = require('fs');
const {stringify} = require ('csv-stringify')


const dataForUpdate = []

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
                    ? parent.querySelector('ul') ? parent.querySelector('ul').innerHTML : ''
                    : parent.textContent.replace(/\t/g, '').replace('Описание','')
                
                return text ==='Функции автоматики' && result.length > 0 ? `<ul>${result}</ul>` : result || ''
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
        async function returnPricesPerPage(page){
            const arrayPrice_currentPage = await page.$$eval('div.frame.prod.content > div.prod-right > span.price-big', allPrices => {
                let result = []

                allPrices.forEach(onePrice => {
                    const price = onePrice.textContent.includes('запросу') 
                        ? ''
                        : onePrice.textContent.includes(' — ')
                            ? onePrice.textContent.split(' — ')[0] 
                            : onePrice.textContent.replace('₽', '')
                    result.push(price)
                })

                return result
            })
            return arrayPrice_currentPage
        }
        async function returnItemData(itemPage, categoryIndex, itemPageIndex, arrayDescription, arrayPrices){
            const photos = await itemPage.$$eval('div.frame.prod.content img', imgs=> {
                const links = imgs.map(img => img.getAttribute('src'))
                return (links.map(link => link.includes('http') ? `${link}; ` : `http://www.breezart.ru${link}; `)).join('')
            })
            const name = await itemPage.$eval('h1', e=>e.textContent)

            let price = arrayPrices[itemPageIndex]
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

            const today = new Date()
            const sku = `${today.getDate()}${today.getMonth()}${today.getFullYear().toString().slice(2)}${today.getMilliseconds()}`
            
            const briefdescription = arrayDescription[itemPageIndex]   

            dataForUpdate.push({name, sku})
            console.log('дата для апдейта: ', dataForUpdate);
            return {photos, name, price, enabled, amount, currency, producer, properties, description, category, sku, briefdescription}
        }
        async function returnItemsDataPerOnePage(isFirstPage, currentPage, linkOnNextPage, categoryIndex){
            const itemsPerPage = []

            if(!isFirstPage) await currentPage.goto(linkOnNextPage) // first page? stay on her and scrap data here

            const arrayPrice_currentPage = await returnPricesPerPage(currentPage) // написать функцию, которая возвращает цены ! готово, девочка моя
            const arrayDescription_currentPage = await returnArrayOfShortDescription(currentPage)
            const linksOnItems = await returnLinksToItemsPerPage(currentPage)

            for(let j = 0; j < linksOnItems.length; j++){
                const pageItem = await browser.newPage()
                await pageItem.goto(linksOnItems[j])

                const itemData = await returnItemData(pageItem, categoryIndex, j, arrayDescription_currentPage, arrayPrice_currentPage)
                itemsPerPage.push(itemData)
                await pageItem.close()
            }
            return itemsPerPage
        }
        async function returnPaginationLinks(page){
            const linkToCurrentPage = await page.evaluate(() => document.location.href);

            const paginationLinks = await page.$$eval('div.scale > a', async elements_a => {
                const linksArray = []
                for(let element_a of elements_a){
                    linksArray.push( element_a.getAttribute('href') )
                }
                return linksArray
            })
            
            return paginationLinks.map(link => `${linkToCurrentPage}${link}`)
        }
        const arrayOfCategories = [
            '[Главная >> Вентиляция >> Вентиляционные установки >> Приточные установки >> Breezart]',
            '[Главная >> Вентиляция >> Вентиляционные установки >> Приточно-вытяжные установки >> Breezart]',
            '[Главная >> Вентиляция >> Вентиляционные установки >> Вытяжные установки >> Breezart]',
            '[Главная >> Вентиляция >> Вентиляционные установки >> Установки для бассейна >> Breezart]',
            '[Главная >> Вентиляция >> Вентиляционное оборудование >> Увлажнители >> Breezart]',
            '[Главная >> Вентиляция >> Запчасти и аксессуары >> Фильтры]'
        ]
        const itemsData = []
        
        console.log('scrape working!');

        const browser = await puppeteer.launch({headless: false}); //{headless: false} для отображения окна
        const mainPage = await browser.newPage();
        await mainPage.goto(this.link);

        mainPage.waitForNavigation()
        const linksOnCategory = await returnCategoryLinksArray(mainPage)


        // открываем каждую категорию:
        for(let i = 0; i < linksOnCategory.length; i++){
            await mainPage.goto(linksOnCategory[i])
            const itemsFromCurrentCategory = []
            const paginationLinks = await returnPaginationLinks(mainPage)

            // собрали итемы с первой страницы
            const itemsFromFirstPage = await returnItemsDataPerOnePage(true, mainPage, linksOnCategory[i], i ) // this is Array of objects
            itemsFromCurrentCategory.push(...itemsFromFirstPage)
            
            //листаем следующие страницы и собираем итемы с них
            for(let p = 0; p < paginationLinks.length; p++){
                const itemsPerPage = await returnItemsDataPerOnePage(false, mainPage, paginationLinks[p], i)
                itemsFromCurrentCategory.push(...itemsPerPage)
            } 
            itemsData.push(...itemsFromCurrentCategory)
        }
        return itemsData
    }
}




async function createCsv(data, dataForUpdate){
    await stringify(data, {header: true, delimiter: ';'},  (err, output) => {
        fs.writeFile('data.csv', output,  err => {
            if(err) console.log(err)
            console.log('удачно запихали всё в csv')
        })
    })
    let content = JSON.stringify(dataForUpdate)
    fs.writeFile('./listOfNameAndSKU.json', content, 'utf-8', err => {
        if(err) console.log(err)
        console.log('создали джсон');
    })
}

async function go(){
    const data = await breezartObject.scrape()
    await createCsv(data, dataForUpdate)
    console.log('dataForUpdate: ', dataForUpdate);
}

go()



module.exports = {
    breezartObject
}