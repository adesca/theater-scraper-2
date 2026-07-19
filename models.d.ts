export interface Listing {
    name: string,
    startDate: string,
    endDate: string,
    company: string,
    id: string,
    tags: string[],
    imageUrl: string
    listingUrl: string
}

export interface Venue {
    id: string,
    theaterName: string,
    address: string,
    website: string
}