async function checkreceurl(inputurl:string) {
    try{
        const url = new URL(inputurl)
        const domain = url.hostname
        const pathseg = url.pathname.split("/")
        const title = pathseg[1]

        if(domain === "racetime.gg"){
            if(title === "deltarune"){

        return "RACETIME"
        }else{
            return "REJECT"
        }
    }else if(domain ==="therun.gg"){
        return "THERUN"
}
    }
    catch{
        return "INVALID"
    }
}