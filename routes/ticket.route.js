import express from "express";
import isAuth from "../middlewares/auth.middleware.js";
import { createTicket, getUserTickets, getOwnerTickets, resolveTicket } from "../controllers/ticket.controller.js";

const ticketRouter = express.Router();

ticketRouter.post("/create", isAuth, createTicket);
ticketRouter.get("/user-tickets", isAuth, getUserTickets);
ticketRouter.get("/owner-tickets", isAuth, getOwnerTickets);
ticketRouter.put("/resolve/:ticketId", isAuth, resolveTicket);

export default ticketRouter;
