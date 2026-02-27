export interface IActivityCategory{
    username: string
    login: boolean
    identify: boolean
    register: boolean
    update: boolean
    delete: boolean
    ordering: string
}

export const initIActivityCategory: IActivityCategory = {
    username: "",
    login: false,
    identify: false,
    register: false,
    update: false,
    delete: false,
    ordering: "DESC",
}