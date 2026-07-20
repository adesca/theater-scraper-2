export interface Listing {
    source: 'breaklegs' | 'NTPA'
    name: string,
    startDate: string,
    endDate: string,
    company: string,
    id: string,
    tags: string[],
    imageUrl: string
    listingUrl: string
    timeOfFetch: string
}

export interface Venue {
    id: string,
    theaterName: string,
    address: string,
    website: string
}