export default interface IRecord {
    hn?: string | null
    firstname?: string | null
    lastname?: string| null
    age?: string | null
    sex?: string | null
    dob?: Date | null
    nationality?: string | null
    r1?: number[] | null
    r2?: number[] | null
    r3?: number[] | null
}

export const IRecordInit: IRecord = {
    hn: "",
    firstname: "",
    lastname:"",
    age: "",
    sex: "",
    dob: null,
    nationality: "",
}

export interface IRecordChildParent {
    child_hn?: string | null
    child_fname?: string | null
    child_lname?: string | null
    child_age?: string | null
    child_sex?: string | null
    child_dob?: Date | null
    child_nationality?: string | null
    parent_hn?: string | null
    parent_fname?: string | null
    parent_lname?: string | null
    parent_age?: string | null
    parent_sex?: string | null
    parent_dob?: Date | null
    parent_nationality?: string | null
}

export const IRecordChildParentInit: IRecordChildParent = {
    child_hn: "",
    child_fname: "",
    child_lname:"",
    child_age: "",
    child_sex: "",
    child_dob: null,
    child_nationality: "",
    parent_hn: "",
    parent_fname: "",
    parent_lname: "",
    parent_age: "",
    parent_sex: "",
    parent_dob: null,
    parent_nationality: "",
}