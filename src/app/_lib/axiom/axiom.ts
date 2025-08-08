import {Axiom} from '@axiomhq/js';

const token = process.env.AXIOM_TOKEN;

// Only initialize Axiom client if a token is provided
const axiomClient = token ? new Axiom({ token }) : null;

export default axiomClient;
