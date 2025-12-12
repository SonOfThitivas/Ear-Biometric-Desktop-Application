export default interface IRecord {
    hn?: string | null
    firstname?: string | null
    lastname?: string| null
    age?: number | null
    sex?: string | null
    dob?: Date | null
    r1?: number[] | null
    r2?: number[] | null
    r3?: number[] | null
}

export interface IRecordChildParent {
    c_hn?: string | null
    c_firstname?: string | null
    c_lastname?: string| null
    c_age?: number | null
    c_sex?: string | null
    c_dob?: Date | null
    p_hn?: string | null
    p_firstname?: string | null
    p_lastname?: string| null
    p_age?: number | null
    p_sex?: string | null
    p_dob?: Date | null
}