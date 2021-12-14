const convertObjectToArray = (data) => {
    let result = []
    Object.keys(data).forEach(key => {
        result.push(key)
        result.push(data[key])
    })
    return result
}

module.exports = convertObjectToArray