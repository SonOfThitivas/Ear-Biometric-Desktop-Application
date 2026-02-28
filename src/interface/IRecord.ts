export default interface IRecord {
    hn?: string | null
    firstname?: string | null
    lastname?: string| null
    age_text?: string | null
    nationality?: string | null
    age?: string | null
    sex?: string | null
    dob?: Date | string | null
    vector?: boolean | null
    r1?: number[] | null
    r2?: number[] | null
    r3?: number[] | null

    // NEW FIELDS
    address?: string | null
    born_detail?: string | null
    born_weight?: string | null
    weight_now?: string | null
    height_length?: string | null
    integrity?: string | null
    data?: string | null
}

export const IRecordInit: IRecord = {
    hn: "",
    firstname: "",
    lastname:"",
    age_text: "",
    nationality: "",
    age: "",
    sex: "",
    dob: null,
    vector: false,
    
    // NEW FIELDS INIT
    address: "",
    born_detail: "",
    born_weight: "",
    weight_now: "",
    height_length: "",
    integrity: "",
    data: "",
}

export interface IRecordChildParent {
    // --- CHILD ---
    child_hn?: string | null
    child_fname?: string | null
    child_lname?: string | null
    child_age_text?: string | null
    child_nationality?: string | null
    child_age?: string | null
    child_sex?: string | null
    child_dob?: Date | null
    child_vector?: boolean | null
    
    // NEW CHILD FIELDS
    child_address?: string | null
    child_born_detail?: string | null
    child_born_weight?: string | null
    child_weight_now?: string | null
    child_height_length?: string | null
    child_integrity?: string | null
    child_data?: string | null

    // --- PARENT ---
    parent_hn?: string | null
    parent_fname?: string | null
    parent_lname?: string | null
    parent_age_text?: string | null
    parent_nationality?: string | null
    parent_age?: string | null
    parent_sex?: string | null
    parent_dob?: Date | null
    parent_vector?: boolean | null

    // NEW PARENT FIELDS
    parent_address?: string | null
    parent_born_detail?: string | null
    parent_born_weight?: string | null
    parent_weight_now?: string | null
    parent_height_length?: string | null
    parent_integrity?: string | null
    parent_data?: string | null
}

export const IRecordChildParentInit: IRecordChildParent = {
    // --- CHILD ---
    child_hn: "",
    child_fname: "",
    child_lname:"",
    child_age_text: "",
    child_nationality: "",
    child_age: "",
    child_sex: "",
    child_dob: null,
    child_vector: false,

    child_address: "",
    child_born_detail: "",
    child_born_weight: "",
    child_weight_now: "",
    child_height_length: "",
    child_integrity: "",
    child_data: "",

    // --- PARENT ---
    parent_hn: "",
    parent_fname: "",
    parent_lname: "",
    parent_age_text: "",
    parent_nationality: "",
    parent_age: "",
    parent_sex: "",
    parent_dob: null,
    parent_vector: false,

    parent_address: "",
    parent_born_detail: "",
    parent_born_weight: "",
    parent_weight_now: "",
    parent_height_length: "",
    parent_integrity: "",
    parent_data: "",
}