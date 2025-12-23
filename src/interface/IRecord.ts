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
    child_hn?: string | null
    child_fname?: string | null
    child_lname?: string | null
    child_age?: number | null
    child_sex?: string | null
    child_dob?: Date | null
    parent_hn?: string | null
    parent_fname?: string | null
    parent_lname?: string | null
    parent_age?: number | null
    parent_sex?: string | null
    parent_dob?: Date | null
}

export const IRecordChildParentInit: IRecordChildParent = {
    child_hn: "",
    child_fname: "",
    child_lname:"",
    child_age: 0,
    child_sex: "",
    child_dob: null,
    parent_hn: "",
    parent_fname: "",
    parent_lname: "",
    parent_age: 0,
    parent_sex: "",
    parent_dob: null,
}