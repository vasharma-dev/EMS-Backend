import { Injectable, NotFoundException } from "@nestjs/common";
import { OrganizersService } from "../organizers/organizers.service";
import { ShopkeepersService } from "../shopkeepers/shopkeepers.service";
import { RegistrationService } from "../roles/registration.service";
import { MailService } from "../roles/mail.service";

@Injectable()
export class RoleService {
  constructor(
    private readonly organizerService: OrganizersService,
    private readonly shopkeeperService: ShopkeepersService,
    private readonly registrationService: RegistrationService,
    private readonly mailService: MailService
  ) {}

  // Check if user already has this role
  async checkRoleAvailability(
    email: string,
    name: string,
    role: "organizer" | "shopkeeper"
  ) {
    if (role === "organizer") {
      const organizer = await this.organizerService.findByEmail(email);
      if (organizer) return { found: true };
    } else if (role === "shopkeeper") {
      const shopkeeper = await this.shopkeeperService.getByEmail(email);
      if (shopkeeper) return { found: true };
    }
    return { found: false, user: { name, email } };
  }

  // Register the new role and send emails
  async registerRole(
    name: string,
    email: string,
    password: string,
    role: "organizer" | "shopkeeper"
  ) {
    // Create pending registration
    const registration = await this.registrationService.createRegistration({
      name,
      email,
      password,
      role,
    });

    // Send admin approval email
    await this.mailService.sendApprovalRequestToAdmin({
      name,
      email,
      role,
    });

    // Send confirmation email to user
    await this.mailService.sendConfirmationToUser({
      name,
      email,
      role,
    });

    return { success: true, message: "Registration sent for approval" };
  }
}
