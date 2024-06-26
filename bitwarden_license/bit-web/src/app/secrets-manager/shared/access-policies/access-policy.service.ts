import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { ListResponse } from "@bitwarden/common/models/response/list.response";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { EncryptService } from "@bitwarden/common/platform/abstractions/encrypt.service";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";

import {
  BaseAccessPolicyView,
  GroupProjectAccessPolicyView,
  GroupServiceAccountAccessPolicyView,
  ProjectAccessPoliciesView,
  ProjectPeopleAccessPoliciesView,
  ServiceAccountProjectAccessPolicyView,
  UserProjectAccessPolicyView,
  UserServiceAccountAccessPolicyView,
  ServiceAccountPeopleAccessPoliciesView,
  ServiceAccountGrantedPoliciesView,
  ServiceAccountProjectPolicyPermissionDetailsView,
} from "../../models/view/access-policy.view";
import { PotentialGranteeView } from "../../models/view/potential-grantee.view";
import { AccessPoliciesCreateRequest } from "../../shared/access-policies/models/requests/access-policies-create.request";
import { PeopleAccessPoliciesRequest } from "../../shared/access-policies/models/requests/people-access-policies.request";
import { ProjectAccessPoliciesResponse } from "../../shared/access-policies/models/responses/project-access-policies.response";
import { ServiceAccountGrantedPoliciesRequest } from "../access-policies/models/requests/service-account-granted-policies.request";

import { AccessPolicyUpdateRequest } from "./models/requests/access-policy-update.request";
import { AccessPolicyRequest } from "./models/requests/access-policy.request";
import {
  GroupServiceAccountAccessPolicyResponse,
  UserServiceAccountAccessPolicyResponse,
  GroupProjectAccessPolicyResponse,
  ServiceAccountProjectAccessPolicyResponse,
  UserProjectAccessPolicyResponse,
} from "./models/responses/access-policy.response";
import { PotentialGranteeResponse } from "./models/responses/potential-grantee.response";
import { ProjectPeopleAccessPoliciesResponse } from "./models/responses/project-people-access-policies.response";
import { ServiceAccountGrantedPoliciesPermissionDetailsResponse } from "./models/responses/service-account-granted-policies-permission-details.response";
import { ServiceAccountPeopleAccessPoliciesResponse } from "./models/responses/service-account-people-access-policies.response";
import { ServiceAccountProjectPolicyPermissionDetailsResponse } from "./models/responses/service-account-project-policy-permission-details.response";

@Injectable({
  providedIn: "root",
})
export class AccessPolicyService {
  private _projectAccessPolicyChanges$ = new Subject<ProjectAccessPoliciesView>();

  /**
   * Emits when a project access policy is created or deleted.
   */
  readonly projectAccessPolicyChanges$ = this._projectAccessPolicyChanges$.asObservable();

  constructor(
    private cryptoService: CryptoService,
    protected apiService: ApiService,
    protected encryptService: EncryptService,
  ) {}

  refreshProjectAccessPolicyChanges() {
    this._projectAccessPolicyChanges$.next(null);
  }

  async getProjectAccessPolicies(
    organizationId: string,
    projectId: string,
  ): Promise<ProjectAccessPoliciesView> {
    const r = await this.apiService.send(
      "GET",
      "/projects/" + projectId + "/access-policies",
      null,
      true,
      true,
    );

    const results = new ProjectAccessPoliciesResponse(r);
    return await this.createProjectAccessPoliciesView(organizationId, results);
  }

  async getProjectPeopleAccessPolicies(
    projectId: string,
  ): Promise<ProjectPeopleAccessPoliciesView> {
    const r = await this.apiService.send(
      "GET",
      "/projects/" + projectId + "/access-policies/people",
      null,
      true,
      true,
    );

    const results = new ProjectPeopleAccessPoliciesResponse(r);
    return this.createProjectPeopleAccessPoliciesView(results);
  }

  async putProjectPeopleAccessPolicies(
    projectId: string,
    peoplePoliciesView: ProjectPeopleAccessPoliciesView,
  ) {
    const request = this.getPeopleAccessPoliciesRequest(peoplePoliciesView);
    const r = await this.apiService.send(
      "PUT",
      "/projects/" + projectId + "/access-policies/people",
      request,
      true,
      true,
    );
    const results = new ProjectPeopleAccessPoliciesResponse(r);
    return this.createProjectPeopleAccessPoliciesView(results);
  }

  async getServiceAccountPeopleAccessPolicies(
    serviceAccountId: string,
  ): Promise<ServiceAccountPeopleAccessPoliciesView> {
    const r = await this.apiService.send(
      "GET",
      "/service-accounts/" + serviceAccountId + "/access-policies/people",
      null,
      true,
      true,
    );

    const results = new ServiceAccountPeopleAccessPoliciesResponse(r);
    return this.createServiceAccountPeopleAccessPoliciesView(results);
  }

  async putServiceAccountPeopleAccessPolicies(
    serviceAccountId: string,
    peoplePoliciesView: ServiceAccountPeopleAccessPoliciesView,
  ) {
    const request = this.getPeopleAccessPoliciesRequest(peoplePoliciesView);
    const r = await this.apiService.send(
      "PUT",
      "/service-accounts/" + serviceAccountId + "/access-policies/people",
      request,
      true,
      true,
    );
    const results = new ServiceAccountPeopleAccessPoliciesResponse(r);
    return this.createServiceAccountPeopleAccessPoliciesView(results);
  }

  async getServiceAccountGrantedPolicies(
    organizationId: string,
    serviceAccountId: string,
  ): Promise<ServiceAccountGrantedPoliciesView> {
    const r = await this.apiService.send(
      "GET",
      "/service-accounts/" + serviceAccountId + "/granted-policies",
      null,
      true,
      true,
    );

    const result = new ServiceAccountGrantedPoliciesPermissionDetailsResponse(r);
    return await this.createServiceAccountGrantedPoliciesView(result, organizationId);
  }

  async putServiceAccountGrantedPolicies(
    organizationId: string,
    serviceAccountId: string,
    policies: ServiceAccountGrantedPoliciesView,
  ): Promise<ServiceAccountGrantedPoliciesView> {
    const request = this.getServiceAccountGrantedPoliciesRequest(policies);
    const r = await this.apiService.send(
      "PUT",
      "/service-accounts/" + serviceAccountId + "/granted-policies",
      request,
      true,
      true,
    );

    const result = new ServiceAccountGrantedPoliciesPermissionDetailsResponse(r);
    return await this.createServiceAccountGrantedPoliciesView(result, organizationId);
  }

  async createProjectAccessPolicies(
    organizationId: string,
    projectId: string,
    projectAccessPoliciesView: ProjectAccessPoliciesView,
  ): Promise<ProjectAccessPoliciesView> {
    const request = this.getAccessPoliciesCreateRequest(projectAccessPoliciesView);
    const r = await this.apiService.send(
      "POST",
      "/projects/" + projectId + "/access-policies",
      request,
      true,
      true,
    );
    const results = new ProjectAccessPoliciesResponse(r);
    const view = await this.createProjectAccessPoliciesView(organizationId, results);
    this._projectAccessPolicyChanges$.next(view);
    return view;
  }

  async deleteAccessPolicy(accessPolicyId: string): Promise<void> {
    await this.apiService.send("DELETE", "/access-policies/" + accessPolicyId, null, true, false);
    this._projectAccessPolicyChanges$.next(null);
  }

  async updateAccessPolicy(baseAccessPolicyView: BaseAccessPolicyView): Promise<void> {
    const payload = new AccessPolicyUpdateRequest();
    payload.read = baseAccessPolicyView.read;
    payload.write = baseAccessPolicyView.write;
    await this.apiService.send(
      "PUT",
      "/access-policies/" + baseAccessPolicyView.id,
      payload,
      true,
      true,
    );
  }

  async getPeoplePotentialGrantees(organizationId: string) {
    const r = await this.apiService.send(
      "GET",
      "/organizations/" + organizationId + "/access-policies/people/potential-grantees",
      null,
      true,
      true,
    );
    const results = new ListResponse(r, PotentialGranteeResponse);
    return await this.createPotentialGranteeViews(organizationId, results.data);
  }

  async getServiceAccountsPotentialGrantees(organizationId: string) {
    const r = await this.apiService.send(
      "GET",
      "/organizations/" + organizationId + "/access-policies/service-accounts/potential-grantees",
      null,
      true,
      true,
    );
    const results = new ListResponse(r, PotentialGranteeResponse);
    return await this.createPotentialGranteeViews(organizationId, results.data);
  }

  async getProjectsPotentialGrantees(organizationId: string) {
    const r = await this.apiService.send(
      "GET",
      "/organizations/" + organizationId + "/access-policies/projects/potential-grantees",
      null,
      true,
      true,
    );
    const results = new ListResponse(r, PotentialGranteeResponse);
    return await this.createPotentialGranteeViews(organizationId, results.data);
  }

  protected async getOrganizationKey(organizationId: string): Promise<SymmetricCryptoKey> {
    return await this.cryptoService.getOrgKey(organizationId);
  }

  protected getAccessPolicyRequest(
    granteeId: string,
    view:
      | UserProjectAccessPolicyView
      | UserServiceAccountAccessPolicyView
      | GroupProjectAccessPolicyView
      | GroupServiceAccountAccessPolicyView
      | ServiceAccountProjectAccessPolicyView,
  ) {
    const request = new AccessPolicyRequest();
    request.granteeId = granteeId;
    request.read = view.read;
    request.write = view.write;
    return request;
  }

  protected createBaseAccessPolicyView(
    response:
      | UserProjectAccessPolicyResponse
      | UserServiceAccountAccessPolicyResponse
      | GroupProjectAccessPolicyResponse
      | GroupServiceAccountAccessPolicyResponse
      | ServiceAccountProjectAccessPolicyResponse,
  ) {
    return {
      id: response.id,
      read: response.read,
      write: response.write,
      creationDate: response.creationDate,
      revisionDate: response.revisionDate,
    };
  }

  private async createPotentialGranteeViews(
    organizationId: string,
    results: PotentialGranteeResponse[],
  ): Promise<PotentialGranteeView[]> {
    const orgKey = await this.getOrganizationKey(organizationId);
    return await Promise.all(
      results.map(async (r) => {
        const view = new PotentialGranteeView();
        view.id = r.id;
        view.type = r.type;
        view.email = r.email;
        view.currentUser = r.currentUser;
        view.currentUserInGroup = r.currentUserInGroup;

        if (r.type === "serviceAccount" || r.type === "project") {
          view.name = r.name
            ? await this.encryptService.decryptToUtf8(new EncString(r.name), orgKey)
            : null;
        } else {
          view.name = r.name;
        }
        return view;
      }),
    );
  }

  private getServiceAccountGrantedPoliciesRequest(
    policies: ServiceAccountGrantedPoliciesView,
  ): ServiceAccountGrantedPoliciesRequest {
    const request = new ServiceAccountGrantedPoliciesRequest();

    request.projectGrantedPolicyRequests = policies.grantedProjectPolicies.map((detailView) => ({
      grantedId: detailView.accessPolicy.grantedProjectId,
      read: detailView.accessPolicy.read,
      write: detailView.accessPolicy.write,
    }));

    return request;
  }

  private async createServiceAccountGrantedPoliciesView(
    response: ServiceAccountGrantedPoliciesPermissionDetailsResponse,
    organizationId: string,
  ): Promise<ServiceAccountGrantedPoliciesView> {
    const orgKey = await this.getOrganizationKey(organizationId);

    const view = new ServiceAccountGrantedPoliciesView();
    view.grantedProjectPolicies =
      await this.createServiceAccountProjectPolicyPermissionDetailsViews(
        orgKey,
        response.grantedProjectPolicies,
      );
    return view;
  }

  private async createServiceAccountProjectPolicyPermissionDetailsViews(
    orgKey: SymmetricCryptoKey,
    responses: ServiceAccountProjectPolicyPermissionDetailsResponse[],
  ): Promise<ServiceAccountProjectPolicyPermissionDetailsView[]> {
    return await Promise.all(
      responses.map(async (response) => {
        return await this.createServiceAccountProjectPolicyPermissionDetailsView(orgKey, response);
      }),
    );
  }

  private async createServiceAccountProjectPolicyPermissionDetailsView(
    orgKey: SymmetricCryptoKey,
    response: ServiceAccountProjectPolicyPermissionDetailsResponse,
  ): Promise<ServiceAccountProjectPolicyPermissionDetailsView> {
    const view = new ServiceAccountProjectPolicyPermissionDetailsView();
    view.hasPermission = response.hasPermission;
    view.accessPolicy = await this.createServiceAccountProjectAccessPolicyView(
      orgKey,
      response.accessPolicy,
    );
    return view;
  }

  private async createProjectAccessPoliciesView(
    organizationId: string,
    projectAccessPoliciesResponse: ProjectAccessPoliciesResponse,
  ): Promise<ProjectAccessPoliciesView> {
    const orgKey = await this.getOrganizationKey(organizationId);
    const view = new ProjectAccessPoliciesView();

    view.userAccessPolicies = projectAccessPoliciesResponse.userAccessPolicies.map((ap) => {
      return this.createUserProjectAccessPolicyView(ap);
    });
    view.groupAccessPolicies = projectAccessPoliciesResponse.groupAccessPolicies.map((ap) => {
      return this.createGroupProjectAccessPolicyView(ap);
    });
    view.serviceAccountAccessPolicies = await Promise.all(
      projectAccessPoliciesResponse.serviceAccountAccessPolicies.map(async (ap) => {
        return await this.createServiceAccountProjectAccessPolicyView(orgKey, ap);
      }),
    );
    return view;
  }

  private createProjectPeopleAccessPoliciesView(
    peopleAccessPoliciesResponse: ProjectPeopleAccessPoliciesResponse,
  ): ProjectPeopleAccessPoliciesView {
    const view = new ProjectPeopleAccessPoliciesView();

    view.userAccessPolicies = peopleAccessPoliciesResponse.userAccessPolicies.map((ap) => {
      return this.createUserProjectAccessPolicyView(ap);
    });
    view.groupAccessPolicies = peopleAccessPoliciesResponse.groupAccessPolicies.map((ap) => {
      return this.createGroupProjectAccessPolicyView(ap);
    });
    return view;
  }

  private createServiceAccountPeopleAccessPoliciesView(
    response: ServiceAccountPeopleAccessPoliciesResponse,
  ): ServiceAccountPeopleAccessPoliciesView {
    const view = new ServiceAccountPeopleAccessPoliciesView();

    view.userAccessPolicies = response.userAccessPolicies.map((ap) => {
      return this.createUserServiceAccountAccessPolicyView(ap);
    });
    view.groupAccessPolicies = response.groupAccessPolicies.map((ap) => {
      return this.createGroupServiceAccountAccessPolicyView(ap);
    });
    return view;
  }

  private getAccessPoliciesCreateRequest(
    projectAccessPoliciesView: ProjectAccessPoliciesView,
  ): AccessPoliciesCreateRequest {
    const createRequest = new AccessPoliciesCreateRequest();

    if (projectAccessPoliciesView.userAccessPolicies?.length > 0) {
      createRequest.userAccessPolicyRequests = projectAccessPoliciesView.userAccessPolicies.map(
        (ap) => {
          return this.getAccessPolicyRequest(ap.organizationUserId, ap);
        },
      );
    }

    if (projectAccessPoliciesView.groupAccessPolicies?.length > 0) {
      createRequest.groupAccessPolicyRequests = projectAccessPoliciesView.groupAccessPolicies.map(
        (ap) => {
          return this.getAccessPolicyRequest(ap.groupId, ap);
        },
      );
    }

    if (projectAccessPoliciesView.serviceAccountAccessPolicies?.length > 0) {
      createRequest.serviceAccountAccessPolicyRequests =
        projectAccessPoliciesView.serviceAccountAccessPolicies.map((ap) => {
          return this.getAccessPolicyRequest(ap.serviceAccountId, ap);
        });
    }
    return createRequest;
  }

  private getPeopleAccessPoliciesRequest(
    view: ProjectPeopleAccessPoliciesView | ServiceAccountPeopleAccessPoliciesView,
  ): PeopleAccessPoliciesRequest {
    const request = new PeopleAccessPoliciesRequest();

    if (view.userAccessPolicies?.length > 0) {
      request.userAccessPolicyRequests = view.userAccessPolicies.map((ap) => {
        return this.getAccessPolicyRequest(ap.organizationUserId, ap);
      });
    }

    if (view.groupAccessPolicies?.length > 0) {
      request.groupAccessPolicyRequests = view.groupAccessPolicies.map((ap) => {
        return this.getAccessPolicyRequest(ap.groupId, ap);
      });
    }

    return request;
  }

  private createUserProjectAccessPolicyView(
    response: UserProjectAccessPolicyResponse,
  ): UserProjectAccessPolicyView {
    return {
      ...this.createBaseAccessPolicyView(response),
      grantedProjectId: response.grantedProjectId,
      organizationUserId: response.organizationUserId,
      organizationUserName: response.organizationUserName,
      userId: response.userId,
      currentUser: response.currentUser,
    };
  }

  private createGroupProjectAccessPolicyView(
    response: GroupProjectAccessPolicyResponse,
  ): GroupProjectAccessPolicyView {
    return {
      ...this.createBaseAccessPolicyView(response),
      grantedProjectId: response.grantedProjectId,
      groupId: response.groupId,
      groupName: response.groupName,
      currentUserInGroup: response.currentUserInGroup,
    };
  }

  private async createServiceAccountProjectAccessPolicyView(
    organizationKey: SymmetricCryptoKey,
    response: ServiceAccountProjectAccessPolicyResponse,
  ): Promise<ServiceAccountProjectAccessPolicyView> {
    return {
      ...this.createBaseAccessPolicyView(response),
      grantedProjectId: response.grantedProjectId,
      serviceAccountId: response.serviceAccountId,
      grantedProjectName: response.grantedProjectName
        ? await this.encryptService.decryptToUtf8(
            new EncString(response.grantedProjectName),
            organizationKey,
          )
        : null,
      serviceAccountName: response.serviceAccountName
        ? await this.encryptService.decryptToUtf8(
            new EncString(response.serviceAccountName),
            organizationKey,
          )
        : null,
    };
  }

  private createUserServiceAccountAccessPolicyView(
    response: UserServiceAccountAccessPolicyResponse,
  ): UserServiceAccountAccessPolicyView {
    return {
      ...this.createBaseAccessPolicyView(response),
      grantedServiceAccountId: response.grantedServiceAccountId,
      organizationUserId: response.organizationUserId,
      organizationUserName: response.organizationUserName,
      userId: response.userId,
      currentUser: response.currentUser,
    };
  }

  private createGroupServiceAccountAccessPolicyView(
    response: GroupServiceAccountAccessPolicyResponse,
  ): GroupServiceAccountAccessPolicyView {
    return {
      ...this.createBaseAccessPolicyView(response),
      grantedServiceAccountId: response.grantedServiceAccountId,
      groupId: response.groupId,
      groupName: response.groupName,
      currentUserInGroup: response.currentUserInGroup,
    };
  }
}
