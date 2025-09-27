import bcrypt from "bcryptjs";


const users = [
     {
        name :"adm",
        email : "adm@gmail.com",
        password:bcrypt.hashSync("123456",10),
        role:"admin"
     },
      {
        name :"welo",
        email : "welo@gmail.com",
        password:bcrypt.hashSync("123456",10),
        role:"agent"
     },
      {
        name :"pesene",
        email : "pesene@gmail.com",
        password:bcrypt.hashSync("123456",10),
        role:"citoyen"
     },
    
  ];
  
  export default users;
  