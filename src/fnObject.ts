import { mapArray } from './fnArray'
import { checkObject } from './fnCheck'
import { toConvertData } from './fnTo'
import { NestedKeys } from './type'

type Payload = Record<string, unknown>

/**
 * @category แปลง profile.name.colors[2].length เป็น array
 * @return ['profile','name','colors','2']
 * @example
 * mapToKeys("profile.name.colors[2].length")
 */
export function mapToKeys(key: Readonly<string>) {
    return key
        .replace(/\[([^\[\]]*)\]/g, '.$1.')
        .split('.')
        .filter((t) => t)
        .filter((t) => t !== 'length')
}

/**
 * @category ตรวจ key[] ใน object
 * @return boolean
 * @example
 * findObjectByKey(payload, ['saleOrderItems[0]','profile.name',])
 */
export function findObjectByKey<T extends object, K extends NestedKeys<T>>(
    payload: Readonly<T>,
    keyNames: K[] | string[]
): boolean {
    if (typeof payload != 'object' || payload == null) return false
    const keys = keyNames.map((key) => mapToKeys(key))
    let isValue: boolean = false
    for (let k = 0; k < keys.length; k++) {
        let items = keys[k]
        let data: any = payload
        for (let i = 0; i < items.length; i++) {
            data = data[items[i]]
            isValue = data !== undefined
            if (isValue == false) {
                break
            }
        }
        if (isValue == false) {
            break
        }
    }
    return isValue
}

/**
 * @category รวม object ระดับ nested ให้เข้ากันในทุกระดับ
 * return
 * {name:'a',profile:{color:'red',email:'email'}}
 * @example
 * mergeObject({name:'a',profile:{color:'red'}},{profile:{email:'email'}})
 */
export function mergeObject(...objects: Readonly<object[]>): Payload {
    try {
        if (!objects.length) {
            throw new Error('At least one object is required')
        }
        return mapArray(objects).reduce((prev, obj) => {
            if (checkObject(obj)) {
                Object.keys(obj).forEach((key) => {
                    const preValue = obj[key]
                    const value = prev[key]

                    if (Array.isArray(value) && Array.isArray(preValue)) {
                        prev[key] = value.concat(...preValue)
                    } else if (checkObject(value) && checkObject(preValue)) {
                        prev[key] = mergeObject(value, preValue)
                    } else {
                        prev[key] = preValue
                    }
                })
            }

            return prev
        }, {})
    } catch (error) {
        console.error('Error in mergeObject:', error)
        return {}
    }
}

export function createObj<T extends object, K extends NestedKeys<T>>(
    payload: Readonly<T>,
    key: K | string
): Payload {
    if (findObjectByKey(payload, [key])) {
        let keys = mapToKeys(key)
        let length = keys.length
        let data: Record<string, any> = payload
        // แยก logic ในฟังก์ชัน createObj ให้เป็นฟังก์ชันย่อยๆ
        function handleArrayValue(data: Record<string, unknown>, key: string) {
            return { [key]: data[key] }
        }

        keys.forEach((_key, index) => {
            const dataValue = data[_key]
            if (dataValue) {
                if (Array.isArray(dataValue))
                    data = handleArrayValue(data, _key)
                else if (checkObject(dataValue)) data = dataValue
                else data = { [`${_key}`]: data[_key] }
            }

            if (index === length - 1) {
                keys.reverse().forEach((k, indexKey) => {
                    if (indexKey != 0) {
                        data = { [`${k}`]: { ...data } }
                    }
                })
                payload = Object.assign(data)
            }
        })

        return payload
    }
    return {}
}

/**
 * @category Find object แล้วสร้างเป็น object ใหม่จาก keys
 * @Return {color:red,profile:{name:Max}}
 * @example
 * checkNestedValue(data,['color',profile.name])
 */
export function selectObject<T extends object, K extends NestedKeys<T>>(
    payload: Readonly<T>,
    items: K[] | string[]
): Payload {
    if (typeof payload != 'object' || payload == null) return {}
    const objArray: object[] = []
    items.forEach((keys) => {
        if (findObjectByKey(payload, [keys])) {
            objArray.push(createObj(payload, keys)!)
        }
    })

    return mergeObject(objArray)
}

/**
 * @category Find object จากส่วนไหนของก็ได้ NestedData
 * @return boolean
 * @example
 * checkNestedValue(data,{
 *  colors: ['red', 'blue', 'green'],
 *  name:'Max'
 *  price:3500
 * })
 */
export function checkNestedValue<T>(
    content: Readonly<T | T[]>,
    rules: Record<string, any>
): boolean {
    let conditions: boolean[] = []
    const keys = Object.keys(rules)
    JSON.stringify(content, (_, nestedValue) => {
        keys.forEach((key) => {
            if (
                (Array.isArray(rules[key]) &&
                    Array.isArray(nestedValue[key])) ||
                (rules[key] &&
                    typeof rules[key] == 'object' &&
                    nestedValue[key] &&
                    typeof nestedValue[key] == 'object')
            ) {
                const check =
                    toConvertData(nestedValue[key]) == toConvertData(rules[key])
                conditions.push(check)
            } else {
                conditions.push(nestedValue[key] == rules[key])
            }
        })
        return nestedValue
    })

    return conditions.filter((v) => v).length === keys.length
}

/**
 * หาค่าสูงสุดจาก array ตาม property ที่กำหนด
 * @param array - array ที่ต้องการหาค่าสูงสุด
 * @param iteratee - ฟังก์ชันที่ใช้ดึงค่าที่ต้องการเปรียบเทียบ
 * @returns payload ค่าสูงสุดของ array | undefined
 */
export const payloadByMax = <T>(
    array: ReadonlyArray<T>,
    iteratee: (item: T) => number
): T | undefined => {
    if (!array.length) return undefined

    return array.reduce((max, item) => {
        return iteratee(item) > iteratee(max) ? item : max
    }, array[0])
}

/**
 * หาค่าสูงสุดจาก array ตาม property ที่กำหนด
 * @param array - array ที่ต้องการหาค่าสูงสุด
 * @param iteratee - ฟังก์ชันที่ใช้ดึงค่าที่ต้องการเปรียบเทียบ
 * @returns payload ค่าน้อยสุดของ array | undefined
 */
export const payloadByMin = <T>(
    array: ReadonlyArray<T>,
    iteratee: (item: T) => number
): T | undefined => {
    if (!array.length) return undefined

    return array.reduce((max, item) => {
        return iteratee(item) < iteratee(max) ? item : max
    }, array[0])
}
